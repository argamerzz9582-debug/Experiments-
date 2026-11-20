#!/usr/bin/env node
/**
 * NIGHTFORGE — Autonomous Minecraft Engineering MCP Server (`nightforge-mcp`)
 * Speaks Model Context Protocol (MCP) over stdio via @modelcontextprotocol/sdk.
 * Exposes 16 comprehensive engineering tools covering live world survey, pathfinding,
 * blockstate placement/breaking, inventory, entities, WorldEdit/bulk edits,
 * reference image/video analysis, blueprint + .schem compilation, staged construction,
 * live-chunk multi-angle PNG screenshots, 12-point verification, repair, and rollback.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { SnapshotManager, ProgressLedger } from '../core/safety-ledger.js';
import { compileNordicGuildhallBlueprint, saveBlueprintArtifacts } from '../core/blueprint-compiler.js';
import { writeSpongeSchematic, verifySpongeSchematicRoundTrip } from '../core/schematic-io.js';
import { voxelListFromBlueprint, renderContactSheetPNG } from '../core/world-renderer.js';
import { verifyLiveStructure } from '../core/verifier.js';
import { NightforgeBuilderController } from '../bot/builder-controller.js';

// Guard stdout strictly for JSON-RPC frames (redirect incidental library console.log to stderr)
console.log = (...args) => console.error('[nightforge-mcp]', ...args);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const snapshotManager = new SnapshotManager(path.join(repoRoot, 'nightforge/snapshots'));
const ledger = new ProgressLedger(repoRoot);

const controller = new NightforgeBuilderController({
  host: process.env.MC_HOST || '127.0.0.1',
  port: Number(process.env.MC_PORT || 25565),
  username: process.env.MC_USERNAME || 'NightforgeBot',
  version: process.env.MC_VERSION || '1.16.5',
  snapshotManager,
  ledger
});

const jsonResponse = data => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }]
});

const errorResponse = (tool, err) => {
  ledger.recordFailure({ tool, error: err.message || String(err), recovery: 'Reported to MCP client for inspection' });
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: err.message || String(err), tool }, null, 2) }]
  };
};

const mcpServer = new McpServer({
  name: 'nightforge-mcp',
  version: '1.0.0'
});

// 0. nf_join_server
mcpServer.tool(
  'nf_join_server',
  'Dynamically join any Minecraft Java Edition server using Mineflayer (supports auto-version detection, offline/cracked or Microsoft auth, and pure_mineflayer non-op survival/creative building).',
  {
    host: z.string(),
    port: z.number().default(25565),
    username: z.string().default('NightforgeBot'),
    version: z.string().default('auto'),
    auth: z.enum(['offline', 'microsoft']).default('offline'),
    buildMode: z.enum(['auto', 'pure_mineflayer', 'commands']).default('auto')
  },
  async args => {
    try {
      const status = await controller.connectToServer(args);
      return jsonResponse({ joined: true, status });
    } catch (err) {
      return errorResponse('nf_join_server', err);
    }
  }
);

// 1. nf_status
mcpServer.tool(
  'nf_status',
  'Connect (if needed) and inspect live bot telemetry, coordinates, gamemode, server version, capabilities, and ledger phase.',
  {},
  async () => {
    try {
      const status = await controller.ensureConnected();
      return jsonResponse({ status, ledgerPhase: ledger.state.currentPhase });
    } catch (err) {
      return errorResponse('nf_status', err);
    }
  }
);

// 2. nf_survey_site
mcpServer.tool(
  'nf_survey_site',
  'Survey terrain heightmap, surface composition, and protected player structures to select a safe build origin.',
  {
    centerX: z.number().optional(),
    centerZ: z.number().optional(),
    radius: z.number().default(24),
    footprintW: z.number().default(23),
    footprintD: z.number().default(23)
  },
  async args => {
    try {
      ledger.update({ currentPhase: 'SURVEYING' });
      const res = await controller.surveySite(args);
      return jsonResponse(res);
    } catch (err) {
      return errorResponse('nf_survey_site', err);
    }
  }
);

// 3. nf_inspect_region
mcpServer.tool(
  'nf_inspect_region',
  'Inspect exact block names and blockstate properties at a coordinate or 3D bounding box.',
  {
    x1: z.number(),
    y1: z.number(),
    z1: z.number(),
    x2: z.number().optional(),
    y2: z.number().optional(),
    z2: z.number().optional()
  },
  async args => {
    try {
      return jsonResponse(await controller.inspectRegion(args));
    } catch (err) {
      return errorResponse('nf_inspect_region', err);
    }
  }
);

// 4. nf_navigate
mcpServer.tool(
  'nf_navigate',
  'Navigate bot safely to target coordinates using mineflayer-pathfinder A* without breaking blocks.',
  {
    x: z.number(),
    y: z.number(),
    z: z.number(),
    range: z.number().default(2),
    canDig: z.boolean().default(false)
  },
  async args => {
    try {
      const pos = await controller.navigateTo(args.x, args.y, args.z, { range: args.range, canDig: args.canDig });
      return jsonResponse({ arrived: true, position: pos });
    } catch (err) {
      return errorResponse('nf_navigate', err);
    }
  }
);

// 5. nf_place_block
mcpServer.tool(
  'nf_place_block',
  'Place a block with full blockstate properties (via embodied hand placement or state-exact setblock).',
  {
    x: z.number(),
    y: z.number(),
    z: z.number(),
    spec: z.string(),
    mode: z.enum(['auto', 'hand', 'exact']).default('auto')
  },
  async args => {
    try {
      return jsonResponse(await controller.placeSingleBlock(args));
    } catch (err) {
      return errorResponse('nf_place_block', err);
    }
  }
);

// 6. nf_break_block
mcpServer.tool(
  'nf_break_block',
  'Break/remove a block at target coordinates after checking container protection rules.',
  {
    x: z.number(),
    y: z.number(),
    z: z.number(),
    force: z.boolean().default(false)
  },
  async args => {
    try {
      return jsonResponse(await controller.breakSingleBlock(args));
    } catch (err) {
      return errorResponse('nf_break_block', err);
    }
  }
);

// 7. nf_inventory
mcpServer.tool(
  'nf_inventory',
  'Inspect bot inventory or ensure/equip construction materials.',
  {
    action: z.enum(['list', 'ensure', 'equip']).default('list'),
    itemName: z.string().optional(),
    count: z.number().default(64)
  },
  async args => {
    try {
      return jsonResponse(await controller.manageInventory(args));
    } catch (err) {
      return errorResponse('nf_inventory', err);
    }
  }
);

// 8. nf_entities
mcpServer.tool(
  'nf_entities',
  'Inspect nearby entities, players, mobs, or dropped items.',
  {
    maxDistance: z.number().default(32)
  },
  async args => {
    try {
      return jsonResponse(await controller.inspectEntities(args));
    } catch (err) {
      return errorResponse('nf_entities', err);
    }
  }
);

// 9. nf_bulk_edit
mcpServer.tool(
  'nf_bulk_edit',
  'Execute WorldEdit / /fill bulk operations (fill, walls, clear) with mandatory pre-mutation undo snapshot & safety checks.',
  {
    operation: z.enum(['fill', 'walls', 'clear']).default('fill'),
    x1: z.number(),
    y1: z.number(),
    z1: z.number(),
    x2: z.number(),
    y2: z.number(),
    z2: z.number(),
    pattern: z.string().default('stone_bricks'),
    allowOverwriteBlueprint: z.boolean().default(false)
  },
  async args => {
    try {
      return jsonResponse(await controller.bulkEdit(args));
    } catch (err) {
      return errorResponse('nf_bulk_edit', err);
    }
  }
);

// 10. nf_analyze_reference
mcpServer.tool(
  'nf_analyze_reference',
  'Analyze an architectural reference image or video-frame directory to extract proportions, symmetry, roof pitch, and block palette.',
  {
    inputPath: z.string(),
    outputPath: z.string().default('assets/reference/reference_analysis.json')
  },
  async ({ inputPath, outputPath }) => {
    try {
      ledger.update({ currentPhase: 'ANALYZING_REFERENCE' });
      const absIn = path.resolve(repoRoot, inputPath);
      const absOut = path.resolve(repoRoot, outputPath);
      const scriptPath = path.join(repoRoot, 'nightforge/scripts/analyze_reference.py');
      const stdout = execFileSync('python3', [scriptPath, '--input', absIn, '--output', absOut], {
        encoding: 'utf8'
      });
      return jsonResponse(JSON.parse(stdout.trim()));
    } catch (err) {
      return errorResponse('nf_analyze_reference', err);
    }
  }
);

// 11. nf_compile_blueprint
mcpServer.tool(
  'nf_compile_blueprint',
  'Compile a coordinate-mapped architectural blueprint JSON, floor/elevation plans Markdown, and lossless Sponge .schem file.',
  {
    originX: z.number(),
    originY: z.number(),
    originZ: z.number(),
    outputDir: z.string().default('blueprints')
  },
  async ({ originX, originY, originZ, outputDir }) => {
    try {
      ledger.update({ currentPhase: 'COMPILING_BLUEPRINT' });
      const bp = compileNordicGuildhallBlueprint({ origin: { x: originX, y: originY, z: originZ } });
      const absOutDir = path.resolve(repoRoot, outputDir);
      const saved = saveBlueprintArtifacts(bp, absOutDir);
      const schemPath = path.join(absOutDir, `${bp.name}.schem`);
      const schemMeta = writeSpongeSchematic(bp, schemPath);
      const roundTrip = await verifySpongeSchematicRoundTrip(schemPath, bp);
      ledger.update({
        buildOrigin: bp.origin,
        boundingBox: bp.boundingBox,
        pendingSections: [...bp.sectionOrder],
        materialRequirements: bp.materialBOM
      });
      return jsonResponse({
        blueprintName: bp.name,
        origin: bp.origin,
        boundingBox: bp.boundingBox,
        totalBlocks: bp.totalBlocks,
        files: { ...saved, schemPath },
        schematicRoundTrip: roundTrip
      });
    } catch (err) {
      return errorResponse('nf_compile_blueprint', err);
    }
  }
);

// 12. nf_build_blueprint
mcpServer.tool(
  'nf_build_blueprint',
  'Autonomously construct a compiled blueprint in the live Minecraft world across topological stages while recording progress.',
  {
    blueprintPath: z.string().default('blueprints/nordic_guildhall_blueprint.json'),
    sections: z.array(z.string()).optional()
  },
  async ({ blueprintPath, sections }) => {
    try {
      const bp = JSON.parse(fs.readFileSync(path.resolve(repoRoot, blueprintPath), 'utf8'));
      const result = await controller.constructBlueprint(bp, { sectionsToBuild: sections });
      return jsonResponse(result);
    } catch (err) {
      return errorResponse('nf_build_blueprint', err);
    }
  }
);

// 13. nf_render_view
mcpServer.tool(
  'nf_render_view',
  'Render a 4-panel shaded 3D isometric + front/side elevation + interior cutaway PNG screenshot from LIVE world chunks or blueprint.',
  {
    source: z.enum(['world', 'blueprint']).default('world'),
    blueprintPath: z.string().default('blueprints/nordic_guildhall_blueprint.json'),
    outputPath: z.string(),
    subtitle: z.string().default('')
  },
  async ({ source, blueprintPath, outputPath, subtitle }) => {
    try {
      const bp = JSON.parse(fs.readFileSync(path.resolve(repoRoot, blueprintPath), 'utf8'));
      const absOut = path.resolve(repoRoot, outputPath);
      let model;
      if (source === 'blueprint') {
        model = voxelListFromBlueprint(bp);
      } else {
        const scanned = await controller.scanBlueprintLiveGrid(bp);
        model = scanned.renderableModel;
      }
      const meta = renderContactSheetPNG(model, absOut, subtitle || source.toUpperCase());
      return jsonResponse({ source, ...meta });
    } catch (err) {
      return errorResponse('nf_render_view', err);
    }
  }
);

// 14. nf_verify_structure
mcpServer.tool(
  'nf_verify_structure',
  'Run all 12 Phase-9 engineering verification checks directly against live Minecraft server chunks.',
  {
    blueprintPath: z.string().default('blueprints/nordic_guildhall_blueprint.json'),
    referenceAnalysisPath: z.string().default('assets/reference/reference_analysis.json')
  },
  async ({ blueprintPath, referenceAnalysisPath }) => {
    try {
      ledger.update({ currentPhase: 'VERIFYING' });
      const bp = JSON.parse(fs.readFileSync(path.resolve(repoRoot, blueprintPath), 'utf8'));
      const absRef = path.resolve(repoRoot, referenceAnalysisPath);
      const ref = fs.existsSync(absRef) ? JSON.parse(fs.readFileSync(absRef, 'utf8')) : null;
      const { liveGrid } = await controller.scanBlueprintLiveGrid(bp);
      const report = verifyLiveStructure(liveGrid, bp, ref);
      ledger.update({
        currentPhase: report.passed ? 'COMPLETED' : 'REPAIR_REQUIRED',
        verificationStatus: {
          state: report.passed ? 'PASSED' : 'DEFECTS_DETECTED',
          gatesPassed: report.gatesPassed,
          gatesTotal: report.gatesTotal,
          lastRunAt: new Date().toISOString(),
          summary: report.defectSummary
        }
      });
      return jsonResponse(report);
    } catch (err) {
      return errorResponse('nf_verify_structure', err);
    }
  }
);

// 15. nf_repair_structure
mcpServer.tool(
  'nf_repair_structure',
  'Autonomously repair detected missing, wrong-state, extraneous, or floating blocks in topological order and re-verify.',
  {
    blueprintPath: z.string().default('blueprints/nordic_guildhall_blueprint.json'),
    referenceAnalysisPath: z.string().default('assets/reference/reference_analysis.json')
  },
  async ({ blueprintPath, referenceAnalysisPath }) => {
    try {
      const bp = JSON.parse(fs.readFileSync(path.resolve(repoRoot, blueprintPath), 'utf8'));
      const absRef = path.resolve(repoRoot, referenceAnalysisPath);
      const ref = fs.existsSync(absRef) ? JSON.parse(fs.readFileSync(absRef, 'utf8')) : null;
      const preScan = await controller.scanBlueprintLiveGrid(bp);
      const preVerify = verifyLiveStructure(preScan.liveGrid, bp, ref);
      const repairRes = await controller.repairDefects(preVerify, bp);
      const postScan = await controller.scanBlueprintLiveGrid(bp);
      const postVerify = verifyLiveStructure(postScan.liveGrid, bp, ref);
      ledger.update({
        currentPhase: postVerify.passed ? 'COMPLETED' : 'REPAIR_REQUIRED',
        verificationStatus: {
          state: postVerify.passed ? 'PASSED' : 'DEFECTS_DETECTED',
          gatesPassed: postVerify.gatesPassed,
          gatesTotal: postVerify.gatesTotal,
          lastRunAt: new Date().toISOString(),
          summary: postVerify.defectSummary
        }
      });
      return jsonResponse({
        repairedCount: repairRes.repairedCount,
        repairsSample: repairRes.repairs.slice(0, 50),
        postRepairVerification: {
          passed: postVerify.passed,
          gatesPassed: postVerify.gatesPassed,
          gatesTotal: postVerify.gatesTotal,
          defectSummary: postVerify.defectSummary
        }
      });
    } catch (err) {
      return errorResponse('nf_repair_structure', err);
    }
  }
);

// 16. nf_rollback
mcpServer.tool(
  'nf_rollback',
  'List saved region safety snapshots or restore a specific snapshotId to undo destructive changes.',
  {
    action: z.enum(['list', 'restore']).default('list'),
    snapshotId: z.string().optional()
  },
  async ({ action, snapshotId }) => {
    try {
      if (action === 'list') {
        return jsonResponse({ snapshots: snapshotManager.listSnapshots() });
      }
      if (!snapshotId) throw new Error('snapshotId is required when action="restore"');
      const res = await controller.rollbackSnapshot(snapshotId);
      ledger.update({ currentPhase: 'ROLLED_BACK' });
      return jsonResponse(res);
    } catch (err) {
      return errorResponse('nf_rollback', err);
    }
  }
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);

process.on('SIGINT', async () => {
  await controller.disconnect();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await controller.disconnect();
  process.exit(0);
});
