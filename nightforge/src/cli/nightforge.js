#!/usr/bin/env node
/**
 * NIGHTFORGE — Command-Line Interface (`nightforge-cli`)
 * Usage:
 *   node nightforge/src/cli/nightforge.js tools
 *   node nightforge/src/cli/nightforge.js analyze <image_or_frames_dir>
 *   node nightforge/src/cli/nightforge.js compile [originX] [originY] [originZ]
 *   node nightforge/src/cli/nightforge.js mission
 */

import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { compileNordicGuildhallBlueprint, saveBlueprintArtifacts } from '../core/blueprint-compiler.js';
import { writeSpongeSchematic, verifySpongeSchematicRoundTrip } from '../core/schematic-io.js';
import { voxelListFromBlueprint, renderContactSheetPNG } from '../core/world-renderer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const [cmd = 'help', ...rest] = process.argv.slice(2);

if (cmd === 'analyze') {
  const input = rest[0] || 'assets/reference/nordic_guildhall_reference.png';
  const output = rest[1] || 'assets/reference/reference_analysis.json';
  const out = execFileSync(
    'python3',
    [path.join(repoRoot, 'nightforge/scripts/analyze_reference.py'), '--input', path.resolve(repoRoot, input), '--output', path.resolve(repoRoot, output)],
    { encoding: 'utf8' }
  );
  console.log(out.trim());
} else if (cmd === 'compile') {
  const ox = Number(rest[0] ?? -8);
  const oy = Number(rest[1] ?? 4);
  const oz = Number(rest[2] ?? 4);
  const bp = compileNordicGuildhallBlueprint({ origin: { x: ox, y: oy, z: oz } });
  const blueprintsDir = path.join(repoRoot, 'blueprints');
  const saved = saveBlueprintArtifacts(bp, blueprintsDir);
  const schemPath = path.join(blueprintsDir, `${bp.name}.schem`);
  writeSpongeSchematic(bp, schemPath);
  const rt = await verifySpongeSchematicRoundTrip(schemPath, bp);
  const preview = renderContactSheetPNG(
    voxelListFromBlueprint(bp),
    path.join(repoRoot, 'renders/blueprint_preview_sheet.png'),
    'COMPILED BLUEPRINT'
  );
  console.log(JSON.stringify({ saved, schemPath, roundTrip: rt, preview }, null, 2));
} else if (cmd === 'join') {
  const flags = new Set(rest.filter(a => a.startsWith('--')));
  const positional = rest.filter(a => !a.startsWith('--'));
  const host = positional[0] || '127.0.0.1';
  const port = Number(positional[1] || 25565);
  const username = positional[2] || 'NightforgeBot';
  const auth = positional[3] || 'offline';
  const version = positional[4] || 'auto';
  const { NightforgeBuilderController } = await import('../bot/builder-controller.js');
  const ctrl = new NightforgeBuilderController({ host, port, username, auth, version });
  try {
    const status = await ctrl.ensureConnected();
    ctrl.bot.chat('NightforgeBot online! Ready for autonomous building.');
    console.log(JSON.stringify({ joined: true, status }, null, 2));
    if (flags.has('--once')) {
      await ctrl.disconnect();
    } else {
      console.log('Bot is staying online in the server (press Ctrl+C to disconnect)...');
      process.on('SIGINT', async () => {
        await ctrl.disconnect();
        process.exit(0);
      });
    }
  } catch (err) {
    console.error(JSON.stringify({ joined: false, host, port, error: err.message }, null, 2));
    process.exit(1);
  }
} else if (cmd === 'remote-build') {
  const host = rest[0] || 'nightforge.mcsh.gg';
  const port = Number(rest[1] || 18206);
  const username = rest[2] || 'NightforgeBot';
  const auth = rest[3] || 'offline';
  const version = rest[4] || 'auto';
  const { NightforgeBuilderController } = await import('../bot/builder-controller.js');
  const { SnapshotRollbackManager, ProgressLedger } = await import('../core/safety-ledger.js');
  const snapshots = new SnapshotRollbackManager(path.join(repoRoot, 'nightforge/snapshots'));
  const ledger = new ProgressLedger(repoRoot);
  const ctrl = new NightforgeBuilderController({
    host,
    port,
    username,
    auth,
    version,
    snapshotManager: snapshots,
    ledger
  });
  const status = await ctrl.ensureConnected();
  console.log('Connected:', JSON.stringify(status, null, 2));
  ctrl.bot.chat('NightforgeBot connected! Surveying site outside spawn-protection...');
  // Respect server.properties spawn-protection=16 when non-opped
  const offset = status.capabilities.opCommands ? 8 : 24;
  const survey = await ctrl.surveySite({
    centerX: status.position.x + offset,
    centerZ: status.position.z + offset,
    radius: 16
  });
  const origin = {
    x: status.position.x + offset,
    y: survey.recommendedBuildOrigin.y,
    z: status.position.z + offset
  };
  const bp = compileNordicGuildhallBlueprint({ origin });
  ctrl.bot.chat(`Building Nordic Guildhall (${bp.blocks.length} blocks) at (${origin.x}, ${origin.y}, ${origin.z})...`);
  const buildRes = await ctrl.buildBlueprint(bp, { allowClearVegetation: true });
  const verifyRes = await ctrl.verifyBlueprintInWorld(bp);
  if (!verifyRes.passed) {
    await ctrl.repairBlueprintDefects(bp);
  }
  const finalVerify = await ctrl.verifyBlueprintInWorld(bp);
  ctrl.bot.chat(`Nordic Guildhall complete! Verification passed: ${finalVerify.passed}`);
  console.log(JSON.stringify({ origin, buildRes, finalVerify }, null, 2));
  await ctrl.disconnect();
} else if (cmd === 'mission') {
  execFileSync('node', [path.join(repoRoot, 'nightforge/src/orchestrator/autonomous-build-run.js')], {
    stdio: 'inherit'
  });
} else {
  console.log(`NIGHTFORGE CLI v1.2.0 — Autonomous Minecraft Engineering
Commands:
  join <host> [port] [user] [offline|microsoft] [auto|1.21.9] [--once]  Join any MC server (auto DNS-SRV + port fallback)
  remote-build <host> [port] [user] [offline|microsoft] [auto|1.21.9]   Join remote server, step past spawn-protection & build Guildhall
  analyze <input_path> [output_json]                                    Analyze architectural image or video frames
  compile [originX] [originY] [originZ]                                 Compile blueprint JSON, Markdown plans, .schem & preview PNG
  mission                                                               Boot local MC server, connect MCP federation, build, repair & verify`);
}
