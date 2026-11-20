/**
 * NIGHTFORGE — Automated Unit, Schematic Round-Trip, Verifier & MCP Protocol Test Suite
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  parseBlockSpec,
  resolveStateId,
  getRegistry,
  inspectPrismarineBlock,
  getPlacementDependencyTier
} from '../src/core/blockstate-utils.js';
import { compileNordicGuildhallBlueprint } from '../src/core/blueprint-compiler.js';
import { writeSpongeSchematic, verifySpongeSchematicRoundTrip } from '../src/core/schematic-io.js';
import { verifyLiveStructure } from '../src/core/verifier.js';
import { NightforgeMcpFederation } from '../src/mcp/mcp-federation-client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

test('blockstate-utils parses properties, resolves 1.16.5 stateIds, and orders attachment tiers', () => {
  const parsed = parseBlockSpec('minecraft:spruce_stairs[facing=east,half=bottom,waterlogged=false]');
  assert.equal(parsed.name, 'spruce_stairs');
  assert.equal(parsed.properties.facing, 'east');
  assert.equal(parsed.properties.half, 'bottom');
  assert.equal(parsed.properties.waterlogged, false);

  const sidEast = resolveStateId('spruce_stairs[facing=east,half=bottom]', '1.16.5');
  const sidWest = resolveStateId('spruce_stairs[facing=west,half=bottom]', '1.16.5');
  assert.notEqual(sidEast, sidWest);

  assert.equal(getPlacementDependencyTier('stone_bricks'), 0);
  assert.equal(getPlacementDependencyTier('oak_door[half=lower,facing=north]'), 1);
  assert.equal(getPlacementDependencyTier('lantern[hanging=true]'), 2);
  assert.equal(getPlacementDependencyTier('spruce_trapdoor[facing=south,open=true]'), 2);
});

test('blueprint compiler & Sponge .schem v2 exporter achieve 100% lossless round-trip', async () => {
  const bp = compileNordicGuildhallBlueprint({ origin: { x: 10, y: 4, z: 10 } });
  assert.ok(bp.totalBlocks > 2400);
  assert.equal(bp.sectionOrder.length, 9);

  const tmpFile = path.join(os.tmpdir(), `nightforge_test_${Date.now()}.schem`);
  const meta = writeSpongeSchematic(bp, tmpFile);
  assert.ok(meta.bytes > 500);

  const rt = await verifySpongeSchematicRoundTrip(tmpFile, bp);
  assert.equal(rt.valid, true);
  assert.equal(rt.mismatches, 0);
  assert.equal(rt.decodedNonAir, bp.totalBlocks);
  fs.rmSync(tmpFile, { force: true });
});

test('12-gate verifier passes clean Guildhall 12/12 and accurately flags injected defects', () => {
  const bp = compileNordicGuildhallBlueprint({ origin: { x: 0, y: 4, z: 0 } });
  const { Block } = getRegistry('1.16.5');
  const grid = new Map();

  for (const sec of bp.sectionOrder) {
    for (const v of bp.sections[sec].voxels) {
      const sid = resolveStateId(v.spec, '1.16.5');
      grid.set(`${v.dx},${v.dy},${v.dz}`, inspectPrismarineBlock(Block.fromStateId(sid, 0)));
    }
  }

  const cleanVer = verifyLiveStructure(grid, bp);
  assert.equal(cleanVer.passed, true);
  assert.equal(cleanVer.gatesPassed, 12);

  // Inject a floating block & punch a sky hole in the roof
  grid.set('2,18,20', { name: 'dirt', stateId: 10, properties: {}, spec: 'dirt' });
  grid.set('8,16,9', { name: 'air', stateId: 0, properties: {}, spec: 'air' });
  grid.set('8,15,9', { name: 'air', stateId: 0, properties: {}, spec: 'air' });

  const brokenVer = verifyLiveStructure(grid, bp);
  assert.equal(brokenVer.passed, false);
  assert.equal(brokenVer.defectSummary.floatingCount, 1);
  assert.equal(brokenVer.defectSummary.missingCount, 2);
});

test('nightforge-mcp stdio server initializes and exposes all 17 engineering tools including nf_join_server', async () => {
  const fed = new NightforgeMcpFederation({ host: '127.0.0.1', port: 25565 });
  try {
    const summary = await fed.connectAll({ includeYuniko: false });
    assert.equal(summary.servers['nightforge-mcp'].toolCount, 17);
    assert.ok(summary.servers['nightforge-mcp'].tools.includes('nf_join_server'));
    assert.ok(summary.servers['nightforge-mcp'].tools.includes('nf_verify_structure'));
    assert.ok(summary.servers['nightforge-mcp'].tools.includes('nf_repair_structure'));
  } finally {
    await fed.closeAll();
  }
});

test('minecraft-skills library contains all 17 specialist skills with all 9 required sections', () => {
  const skillsDir = path.join(repoRoot, 'minecraft-skills/skills');
  const entries = fs.readdirSync(skillsDir);
  assert.equal(entries.length, 17);

  const required = [
    '## Role',
    '## Capabilities',
    '## Tools',
    '## Workflow',
    '## Decision Rules',
    '## Safety Rules',
    '## Failure Handling',
    '## Verification',
    '## Fallback Strategies'
  ];
  for (const s of entries) {
    const md = fs.readFileSync(path.join(skillsDir, s, 'SKILL.md'), 'utf8');
    for (const h of required) {
      assert.ok(md.includes(h), `${s}/SKILL.md missing ${h}`);
    }
  }
});
