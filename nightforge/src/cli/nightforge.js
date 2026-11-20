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
} else if (cmd === 'mission') {
  execFileSync('node', [path.join(repoRoot, 'nightforge/src/orchestrator/autonomous-build-run.js')], {
    stdio: 'inherit'
  });
} else {
  console.log(`NIGHTFORGE CLI v1.0.0 — Autonomous Minecraft Engineering
Commands:
  analyze <input_path> [output_json]     Analyze architectural image or video frames
  compile [originX] [originY] [originZ]  Compile blueprint JSON, Markdown plans, .schem & preview PNG
  mission                                Boot local MC server, connect MCP federation, build, repair & verify`);
}
