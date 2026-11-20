/**
 * NIGHTFORGE — Safety Scanner, Reversible Snapshot Manager & Persistent Progress Ledger
 * Covers Phase 7 (Progress Ledger) and Phase 8 (Safety & Recovery).
 */

import fs from 'fs';
import path from 'path';

export const PROTECTED_PLAYER_BLOCKS = new Set([
  'chest',
  'trapped_chest',
  'ender_chest',
  'barrel',
  'shulker_box',
  'white_shulker_box',
  'spawner',
  'beacon',
  'enchanting_table',
  'Command_block',
  'command_block',
  'lectern',
  'respawn_anchor',
  'nether_portal',
  'end_portal_frame'
]);

export const ARTIFICIAL_STRUCTURE_INDICATORS = new Set([
  ...PROTECTED_PLAYER_BLOCKS,
  'oak_planks',
  'spruce_planks',
  'birch_planks',
  'dark_oak_planks',
  'stone_bricks',
  'bricks',
  'glass',
  'glass_pane',
  'crafting_table',
  'furnace',
  'oak_door',
  'spruce_door',
  'iron_door',
  'cobblestone_wall'
]);

export class SnapshotManager {
  constructor(snapshotDir) {
    this.snapshotDir = snapshotDir;
    fs.mkdirSync(this.snapshotDir, { recursive: true });
  }

  saveSnapshot({ label, bounds, blocks, serverInfo }) {
    const id = `snap_${Date.now()}_${label.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)}`;
    const filePath = path.join(this.snapshotDir, `${id}.json`);
    const payload = {
      id,
      label,
      createdAt: new Date().toISOString(),
      serverInfo,
      bounds,
      blockCount: blocks.length,
      blocks // Array of [x, y, z, spec]
    };
    fs.writeFileSync(filePath, JSON.stringify(payload));
    return { id, filePath, blockCount: blocks.length, bounds, createdAt: payload.createdAt };
  }

  loadSnapshot(id) {
    const filePath = path.join(this.snapshotDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Snapshot not found: ${id}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  listSnapshots() {
    if (!fs.existsSync(this.snapshotDir)) return [];
    return fs
      .readdirSync(this.snapshotDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .map(f => {
        const raw = JSON.parse(fs.readFileSync(path.join(this.snapshotDir, f), 'utf8'));
        return {
          id: raw.id,
          label: raw.label,
          createdAt: raw.createdAt,
          bounds: raw.bounds,
          blockCount: raw.blockCount
        };
      });
  }
}

export class ProgressLedger {
  constructor(repoRoot) {
    this.jsonPath = path.join(repoRoot, 'progress-ledger.json');
    this.mdPath = path.join(repoRoot, 'PROGRESS_LEDGER.md');
    this.state = this._loadOrInit();
  }

  _loadOrInit() {
    if (fs.existsSync(this.jsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
      } catch {
        // Re-initialize if malformed
      }
    }
    return {
      missionId: `nightforge-${new Date().toISOString().slice(0, 10)}`,
      projectName: 'Nightforge Nordic Guildhall',
      updatedAt: new Date().toISOString(),
      currentPhase: 'INITIALIZING',
      serverConnection: null,
      currentCoordinates: null,
      buildOrigin: null,
      boundingBox: null,
      completedSections: [],
      pendingSections: [],
      materialRequirements: {},
      snapshots: [],
      toolFailures: [],
      repairs: [],
      verificationStatus: {
        state: 'PENDING',
        gatesPassed: 0,
        gatesTotal: 12,
        lastRunAt: null,
        summary: null
      }
    };
  }

  update(patch) {
    Object.assign(this.state, patch, { updatedAt: new Date().toISOString() });
    this.save();
    return this.state;
  }

  recordSectionCompleted(sectionId, stats) {
    this.state.pendingSections = this.state.pendingSections.filter(s => s !== sectionId);
    const existingIdx = this.state.completedSections.findIndex(s => s.section === sectionId);
    const entry = {
      section: sectionId,
      completedAt: new Date().toISOString(),
      ...stats
    };
    if (existingIdx >= 0) this.state.completedSections[existingIdx] = entry;
    else this.state.completedSections.push(entry);
    this.save();
  }

  recordFailure(failure) {
    this.state.toolFailures.push({
      timestamp: new Date().toISOString(),
      ...failure
    });
    this.save();
  }

  recordRepair(repair) {
    this.state.repairs.push({
      timestamp: new Date().toISOString(),
      ...repair
    });
    this.save();
  }

  recordSnapshot(snapMeta) {
    this.state.snapshots.push(snapMeta);
    this.save();
  }

  save() {
    this.state.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.jsonPath, JSON.stringify(this.state, null, 2));
    fs.writeFileSync(this.mdPath, this._renderMarkdown());
  }

  _renderMarkdown() {
    const s = this.state;
    const lines = [
      `# NIGHTFORGE — AUTONOMOUS CONSTRUCTION PROGRESS LEDGER`,
      ``,
      `- **Mission ID:** \`${s.missionId}\``,
      `- **Project:** ${s.projectName}`,
      `- **Last Updated:** \`${s.updatedAt}\``,
      `- **Current Phase:** \`${s.currentPhase}\``,
      `- **Server Connection:** \`${s.serverConnection ? `${s.serverConnection.host}:${s.serverConnection.port} (MC ${s.serverConnection.version}, gamemode=${s.serverConnection.gameMode})` : 'Not connected'}\``,
      `- **Bot Coordinates:** \`${s.currentCoordinates ? `(${s.currentCoordinates.x}, ${s.currentCoordinates.y}, ${s.currentCoordinates.z})` : 'N/A'}\``,
      `- **Build Origin:** \`${s.buildOrigin ? `(${s.buildOrigin.x}, ${s.buildOrigin.y}, ${s.buildOrigin.z})` : 'N/A'}\``,
      `- **Bounding Box:** \`${s.boundingBox ? `[${s.boundingBox.min.join(', ')}] -> [${s.boundingBox.max.join(', ')}]` : 'N/A'}\``,
      `- **Verification Status:** **${s.verificationStatus.state}** (\`${s.verificationStatus.gatesPassed}/${s.verificationStatus.gatesTotal}\` engineering gates passed)`,
      ``,
      `---`,
      ``,
      `## 1. Completed Construction Sections (${s.completedSections.length})`,
      ``
    ];

    if (s.completedSections.length === 0) {
      lines.push(`_None yet._`);
    } else {
      lines.push(`| Section | Blocks Placed | Bulk Ops | Bot Hand/State Ops | Completed At |`);
      lines.push(`|---|---:|---:|---:|---|`);
      for (const sec of s.completedSections) {
        lines.push(
          `| \`${sec.section}\` | ${sec.blocksPlaced ?? 0} | ${sec.bulkOps ?? 0} | ${sec.singleOps ?? 0} | \`${sec.completedAt}\` |`
        );
      }
    }

    lines.push(``, `## 2. Pending Sections (${s.pendingSections.length})`, ``);
    lines.push(s.pendingSections.length ? s.pendingSections.map(p => `- \`${p}\``).join('\n') : `_All planned sections completed._`);

    lines.push(``, `## 3. Material Bill of Materials (Top Block Types)`, ``);
    const bomEntries = Object.entries(s.materialRequirements || {}).sort((a, b) => b[1] - a[1]);
    if (bomEntries.length === 0) {
      lines.push(`_Pending blueprint compilation._`);
    } else {
      lines.push(`| Block Type | Total Quantity | Survival Stacks (64) |`);
      lines.push(`|---|---:|---:|`);
      for (const [blk, qty] of bomEntries.slice(0, 22)) {
        lines.push(`| \`${blk}\` | ${qty} | ${Math.ceil(qty / 64)} |`);
      }
    }

    lines.push(``, `## 4. Safety Snapshots (${s.snapshots.length})`, ``);
    if (s.snapshots.length === 0) {
      lines.push(`_No snapshots recorded yet._`);
    } else {
      for (const snap of s.snapshots) {
        lines.push(`- \`${snap.id}\` — **${snap.label}** (${snap.blockCount} blocks captured at \`${snap.createdAt}\`)`);
      }
    }

    lines.push(``, `## 5. Tool Failures & Recovery Events (${s.toolFailures.length})`, ``);
    if (s.toolFailures.length === 0) {
      lines.push(`_Zero unrecovered tool failures._`);
    } else {
      for (const f of s.toolFailures) {
        lines.push(`- \`[${f.timestamp}]\` **${f.tool || f.stage}**: ${f.error} -> Recovery: _${f.recovery || 'Handled'}_`);
      }
    }

    lines.push(``, `## 6. Autonomous Defect Repairs (${s.repairs.length})`, ``);
    if (s.repairs.length === 0) {
      lines.push(`_No repairs recorded yet._`);
    } else {
      lines.push(`| Timestamp | Coordinate | Defect Type | Previous | Repaired With | Status |`);
      lines.push(`|---|---|---|---|---|---|`);
      for (const r of s.repairs) {
        lines.push(
          `| \`${r.timestamp}\` | \`(${r.coord?.join(', ')})\` | ${r.defectType} | \`${r.previous}\` | \`${r.repairedWith}\` | ${r.status || 'VERIFIED'} |`
        );
      }
    }

    return lines.join('\n') + '\n';
  }
}
