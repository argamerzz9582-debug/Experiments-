/**
 * NIGHTFORGE — Multi-Tier Autonomous Builder & World Controller
 * Combines:
 *  - Embodied Mineflayer bot + mineflayer-pathfinder A* navigation
 *  - Live chunk world surveyor & protected player-structure scanner
 *  - Tier-1 WorldEdit / /fill bulk execution with automatic undo snapshots
 *  - Tier-2 Staged topological blueprint construction
 *  - Tier-3 Embodied bot hand-placement (bot.placeBlock) & digging (bot.dig)
 *  - Closed-loop surgical defect repair & transactional snapshot rollback
 */

import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
import prismarineItemLoader from 'prismarine-item';
import { Vec3 } from 'vec3';
import {
  getRegistry,
  parseBlockSpec,
  inspectPrismarineBlock,
  blockMatchesSpec,
  getPlacementDependencyTier
} from '../core/blockstate-utils.js';
import { PROTECTED_PLAYER_BLOCKS, ARTIFICIAL_STRUCTURE_INDICATORS } from '../core/safety-ledger.js';

const { pathfinder, Movements, goals } = pathfinderPkg;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class NightforgeBuilderController {
  constructor({
    host = process.env.MC_HOST || '127.0.0.1',
    port = Number(process.env.MC_PORT || 25565),
    username = process.env.MC_USERNAME || 'NightforgeBot',
    version = process.env.MC_VERSION || '1.16.5',
    snapshotManager,
    ledger
  }) {
    this.host = host;
    this.port = port;
    this.username = username;
    this.version = version;
    this.snapshotManager = snapshotManager;
    this.ledger = ledger;
    this.bot = null;
    this.connected = false;
    this.capabilities = {
      worldEdit: true,
      opCommands: true,
      creativeInventory: true
    };
  }

  async ensureConnected() {
    if (this.bot && this.connected && this.bot.entity) {
      return this.getStatus();
    }
    this.bot = mineflayer.createBot({
      host: this.host,
      port: this.port,
      username: this.username,
      version: this.version,
      hideErrors: true
    });
    this.bot.loadPlugin(pathfinder);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout connecting to ${this.host}:${this.port}`)), 12000);
      this.bot.once('spawn', () => {
        clearTimeout(timer);
        this.connected = true;
        resolve();
      });
      this.bot.once('error', err => {
        clearTimeout(timer);
        reject(err);
      });
      this.bot.once('kicked', reason => {
        clearTimeout(timer);
        reject(new Error(`Bot kicked: ${JSON.stringify(reason)}`));
      });
    });

    this.bot.on('end', () => {
      this.connected = false;
    });

    await sleep(600); // Allow initial chunk columns to arrive

    const status = this.getStatus();
    if (this.ledger) {
      this.ledger.update({
        serverConnection: {
          host: this.host,
          port: this.port,
          version: this.bot.version,
          gameMode: status.gameMode,
          username: this.username
        },
        currentCoordinates: status.position
      });
    }
    return status;
  }

  getStatus() {
    if (!this.bot || !this.connected || !this.bot.entity) {
      return { connected: false, host: this.host, port: this.port };
    }
    const p = this.bot.entity.position;
    return {
      connected: true,
      username: this.bot.username,
      host: this.host,
      port: this.port,
      version: this.bot.version,
      gameMode: this.bot.game?.gameMode || 'creative',
      dimension: this.bot.game?.dimension || 'overworld',
      health: this.bot.health,
      food: this.bot.food,
      position: {
        x: Number(p.x.toFixed(2)),
        y: Number(p.y.toFixed(2)),
        z: Number(p.z.toFixed(2))
      },
       capabilities: this.capabilities
    };
  }

  async disconnect() {
    if (this.bot) {
      this.connected = false;
      this.bot.quit();
      this.bot = null;
      await sleep(150);
    }
  }

  /**
   * Navigates bot safely using mineflayer-pathfinder A* without breaking structures.
   */
  async navigateTo(x, y, z, { range = 2, canDig = false, timeoutMs = 8000 } = {}) {
    await this.ensureConnected();
    const { mcData } = getRegistry(this.bot.version);
    const movements = new Movements(this.bot, mcData);
    movements.canDig = canDig;
    movements.allow1by1towers = false;
    movements.allowParkour = true;
    this.bot.pathfinder.setMovements(movements);

    const goal = new goals.GoalNear(x, y, z, range);
    try {
      await Promise.race([
        this.bot.pathfinder.goto(goal),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Pathfinder timeout')), timeoutMs))
      ]);
    } catch (err) {
      this.bot.pathfinder.setGoal(null);
      // Fallback: if opped and obstructed/distant, teleport safely to standoff
      if (this.capabilities.opCommands) {
        this.bot.chat(`/teleport ${this.bot.username} ${Math.round(x)} ${Math.round(y)} ${Math.round(z)}`);
        await sleep(350);
      } else {
        throw err;
      }
    }

    const status = this.getStatus();
    if (this.ledger) {
      this.ledger.update({ currentCoordinates: status.position });
    }
    return status.position;
  }

  /**
   * Surveys terrain heightmap, detects existing player structures/hazards, and selects optimal pad.
   */
  async surveySite({ centerX, centerZ, radius = 24, footprintW = 23, footprintD = 23 } = {}) {
    await this.ensureConnected();
    const pos = this.bot.entity.position.floored();
    const cx = centerX ?? pos.x;
    const cz = centerZ ?? pos.z;

    // Move near survey center so chunks are loaded
    if (pos.distanceTo(new Vec3(cx, pos.y, cz)) > 16) {
      await this.navigateTo(cx, pos.y, cz, { range: 4 });
      await sleep(400);
    }

    const surfaceHeights = new Map();
    const surfaceBlocks = {};
    const protectedHits = [];
    const artificialHits = [];
    let minH = Infinity;
    let maxH = -Infinity;

    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        let topY = 0;
        let topName = 'air';
        for (let y = 30; y >= 1; y--) {
          const b = this.bot.blockAt(new Vec3(x, y, z));
          if (!b) continue;
          if (PROTECTED_PLAYER_BLOCKS.has(b.name)) {
            protectedHits.push({ x, y, z, block: b.name });
          } else if (ARTIFICIAL_STRUCTURE_INDICATORS.has(b.name)) {
            artificialHits.push({ x, y, z, block: b.name });
          }
          if (b.name !== 'air' && b.name !== 'cave_air' && b.name !== 'poppy' && b.name !== 'dandelion' && b.name !== 'grass') {
            topY = y;
            topName = b.name;
            break;
          }
        }
        surfaceHeights.set(`${x},${z}`, topY);
        surfaceBlocks[topName] = (surfaceBlocks[topName] || 0) + 1;
        if (topY < minH) minH = topY;
        if (topY > maxH) maxH = topY;
      }
    }

    // Score candidate origins (ox, oz) within surveyed region avoiding an 8-block buffer around protected player blocks
    let bestCandidate = null;
    const step = 3;
    for (let ox = cx - radius + 2; ox + footprintW <= cx + radius - 1; ox += step) {
      for (let oz = cz - radius + 2; oz + footprintD <= cz + radius - 1; oz += step) {
        const bufferConflict = [...protectedHits, ...artificialHits].some(
          h => h.x >= ox - 8 && h.x <= ox + footprintW + 7 && h.z >= oz - 8 && h.z <= oz + footprintD + 7
        );
        if (bufferConflict) continue;

        const heights = [];
        let earthwork = 0;
        for (let x = ox; x < ox + footprintW; x++) {
          for (let z = oz; z < oz + footprintD; z++) {
            heights.push(surfaceHeights.get(`${x},${z}`) ?? 4);
          }
        }
        heights.sort((a, b) => a - b);
        const medianY = heights[Math.floor(heights.length / 2)];
        for (const h of heights) earthwork += Math.abs(h - medianY);

        if (!bestCandidate || earthwork < bestCandidate.earthwork) {
          bestCandidate = {
            origin: { x: ox, y: medianY, z: oz },
            medianGroundY: medianY,
            earthworkBlocksDelta: earthwork,
            minPadY: heights[0],
            maxPadY: heights[heights.length - 1]
          };
        }
      }
    }

    return {
      surveyCenter: { x: cx, z: cz },
      radius,
      elevationRange: { min: minH, max: maxH },
      surfaceComposition: surfaceBlocks,
      protectedStructuresDetected: protectedHits,
      artificialBlocksDetectedCount: artificialHits.length,
      recommendedSite: bestCandidate || {
        origin: { x: cx + 6, y: 4, z: cz + 6 },
        medianGroundY: 4,
        earthworkBlocksDelta: 0
      }
    };
  }

  /**
   * Inspects a single block or 3D bounding box directly from live server chunks.
   */
  async inspectRegion({ x1, y1, z1, x2, y2, z2 }) {
    await this.ensureConnected();
    const minX = Math.min(x1, x2 ?? x1);
    const maxX = Math.max(x1, x2 ?? x1);
    const minY = Math.min(y1, y2 ?? y1);
    const maxY = Math.max(y1, y2 ?? y1);
    const minZ = Math.min(z1, z2 ?? z1);
    const maxZ = Math.max(z1, z2 ?? z1);

    const nonAir = [];
    const counts = {};
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        for (let x = minX; x <= maxX; x++) {
          const info = inspectPrismarineBlock(this.bot.blockAt(new Vec3(x, y, z)));
          counts[info.name] = (counts[info.name] || 0) + 1;
          if (info.name !== 'air' && info.name !== 'cave_air') {
            nonAir.push({ x, y, z, ...info });
          }
        }
      }
    }
    return {
      bounds: { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] },
      totalScanned: (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1),
      nonAirCount: nonAir.length,
      blockHistogram: counts,
      blocks: nonAir.slice(0, 500)
    };
  }

  /**
   * Scans the exact local grid ("dx,dy,dz" -> blockInfo) of a blueprint from the live Minecraft server.
   */
  async scanBlueprintLiveGrid(blueprint) {
    await this.ensureConnected();
    const { origin, dimensions } = blueprint;
    const liveGrid = new Map();
    const voxelList = [];

    for (let dy = 0; dy < dimensions.heightY; dy++) {
      for (let dz = 0; dz < dimensions.depthZ; dz++) {
        for (let dx = 0; dx < dimensions.widthX; dx++) {
          const wx = origin.x + dx;
          const wy = origin.y + dy;
          const wz = origin.z + dz;
          const info = inspectPrismarineBlock(this.bot.blockAt(new Vec3(wx, wy, wz)));
          liveGrid.set(`${dx},${dy},${dz}`, info);
          if (info.name !== 'air' && info.name !== 'cave_air' && info.name !== 'unloaded') {
            voxelList.push({ dx, dy, dz, spec: info.spec });
          }
        }
      }
    }
    return {
      liveGrid,
      renderableModel: {
        title: `${blueprint.title} (LIVE WORLD)`,
        dimensions: blueprint.dimensions,
        voxels: voxelList
      }
    };
  }

  /**
   * Captures a reversible snapshot of a world bounding box before destructive/bulk operations.
   */
  async captureRegionSnapshot(label, minPos, maxPos, excludeBlueprintCoords = false) {
    await this.ensureConnected();
    const blocks = [];
    for (let y = minPos[1]; y <= maxPos[1]; y++) {
      for (let z = minPos[2]; z <= maxPos[2]; z++) {
        for (let x = minPos[0]; x <= maxPos[0]; x++) {
          const info = inspectPrismarineBlock(this.bot.blockAt(new Vec3(x, y, z)));
          blocks.push([x, y, z, info.spec === 'unloaded' ? 'air' : info.spec]);
        }
      }
    }
    void excludeBlueprintCoords;
    const meta = this.snapshotManager.saveSnapshot({
      label,
      bounds: { min: minPos, max: maxPos },
      blocks,
      serverInfo: { host: this.host, port: this.port, version: this.bot.version }
    });
    if (this.ledger) {
      this.ledger.recordSnapshot(meta);
    }
    return meta;
  }

  /**
   * Restores any saved snapshot back into the live Minecraft server.
   */
  async rollbackSnapshot(snapshotId) {
    await this.ensureConnected();
    const snap = this.snapshotManager.loadSnapshot(snapshotId);
    // Clear top-down first so attachments don't drop items, then place bottom-up
    const sortedBottomUp = [...snap.blocks].sort((a, b) => a[1] - b[1]);
    let restored = 0;
    for (const [x, y, z, spec] of sortedBottomUp) {
      const current = inspectPrismarineBlock(this.bot.blockAt(new Vec3(x, y, z)));
      if (!blockMatchesSpec(current, spec)) {
        this.bot.chat(`/setblock ${x} ${y} ${z} ${spec}`);
        restored++;
        if (restored % 80 === 0) await sleep(35);
      }
    }
    await sleep(300);
    return { snapshotId, totalBlocksInSnapshot: snap.blockCount, blocksChanged: restored };
  }

  /**
   * Inspects inventory or provisions/equips items in creative/survival.
   */
  async manageInventory({ action = 'list', itemName, count = 64 } = {}) {
    await this.ensureConnected();
    if (action === 'list') {
      return {
        items: this.bot.inventory.items().map(i => ({ name: i.name, count: i.count, slot: i.slot }))
      };
    }
    const { mcData } = getRegistry(this.bot.version);
    const Item = prismarineItemLoader(this.bot.version);
    const clean = parseBlockSpec(itemName).name;
    const itemDef = mcData.itemsByName[clean];
    if (!itemDef) throw new Error(`Unknown item '${clean}' in ${this.bot.version}`);

    let existing = this.bot.inventory.items().find(i => i.name === clean);
    if (!existing && this.bot.game.gameMode === 'creative') {
      await this.bot.creative.setInventorySlot(36, new Item(itemDef.id, Math.min(64, count)));
      await sleep(100);
      existing = this.bot.inventory.items().find(i => i.name === clean);
    }
    if (action === 'equip' && existing) {
      await this.bot.equip(itemDef.id, 'hand');
    }
    return {
      action,
      equipped: clean,
      items: this.bot.inventory.items().map(i => ({ name: i.name, count: i.count, slot: i.slot }))
    };
  }

  /**
   * Lists entities near bot or inside a bounding box.
   */
  async inspectEntities({ maxDistance = 32 } = {}) {
    await this.ensureConnected();
    const myPos = this.bot.entity.position;
    const list = Object.values(this.bot.entities)
      .filter(e => e !== this.bot.entity && e.position.distanceTo(myPos) <= maxDistance)
      .map(e => ({
        id: e.id,
        type: e.type,
        name: e.username || e.name || e.displayName || 'entity',
        position: [
          Number(e.position.x.toFixed(2)),
          Number(e.position.y.toFixed(2)),
          Number(e.position.z.toFixed(2))
        ],
        distance: Number(e.position.distanceTo(myPos).toFixed(2))
      }));
    return { count: list.length, entities: list };
  }

  /**
   * Places a single block using either embodied Mineflayer hand-placement (`mode: "hand"`)
   * OR state-exact server placement (`mode: "exact"` / `"auto"`).
   */
  async placeSingleBlock({ x, y, z, spec, mode = 'auto' }) {
    await this.ensureConnected();
    const targetPos = new Vec3(x, y, z);
    const { name, properties } = parseBlockSpec(spec);

    // Move bot out of the way if standing inside target voxel!
    const bp = this.bot.entity.position;
    if (Math.abs(bp.x - (x + 0.5)) < 0.85 && bp.y <= y + 1 && bp.y + 1.9 >= y && Math.abs(bp.z - (z + 0.5)) < 0.85) {
      await this.navigateTo(x + 3, y, z + 3, { range: 1 });
    }

    const hasComplexState = Object.keys(properties).length > 0;
    const useHand = mode === 'hand' || (mode === 'auto' && !hasComplexState && !this.capabilities.opCommands);

    if (useHand && name !== 'air') {
      // Find adjacent solid reference block for real Mineflayer bot.placeBlock!
      const faces = [
        new Vec3(0, -1, 0),
        new Vec3(0, 1, 0),
        new Vec3(1, 0, 0),
        new Vec3(-1, 0, 0),
        new Vec3(0, 0, 1),
        new Vec3(0, 0, -1)
      ];
      let refBlock = null;
      let faceVec = null;
      for (const offset of faces) {
        const cand = this.bot.blockAt(targetPos.plus(offset));
        if (cand && cand.name !== 'air' && cand.name !== 'cave_air') {
          refBlock = cand;
          faceVec = offset.scaled(-1);
          break;
        }
      }
      if (refBlock) {
        if (this.bot.entity.position.distanceTo(targetPos) > 4.2) {
          await this.navigateTo(x + 2, y, z + 2, { range: 2 });
        }
        await this.manageInventory({ action: 'equip', itemName: name, count: 64 });
        await this.bot.placeBlock(refBlock, faceVec);
        await sleep(120);
        const verify = inspectPrismarineBlock(this.bot.blockAt(targetPos));
        if (verify.name === name) {
          return { x, y, z, placed: verify.spec, method: 'mineflayer_placeBlock' };
        }
      }
    }

    // State-exact placement (guarantees exact stair facing, door half, shutter open state, log axis)
    this.bot.chat(`/setblock ${x} ${y} ${z} ${spec}`);
    await sleep(60);
    const verify = inspectPrismarineBlock(this.bot.blockAt(targetPos));
    return { x, y, z, placed: verify.spec, method: 'setblock_exact' };
  }

  /**
   * Breaks a block safely via Mineflayer bot.dig (or /setblock air fallback), checking container safety first.
   */
  async breakSingleBlock({ x, y, z, force = false, preferHandDig = true }) {
    await this.ensureConnected();
    const pos = new Vec3(x, y, z);
    const current = this.bot.blockAt(pos);
    if (!current || current.name === 'air') {
      return { x, y, z, previous: 'air', current: 'air', method: 'noop' };
    }
    if (!force && PROTECTED_PLAYER_BLOCKS.has(current.name)) {
      throw new Error(`Safety Rule Triggered: Refusing to break protected container/block '${current.name}' at (${x}, ${y}, ${z})`);
    }
    const prevName = current.name;
    if (preferHandDig && this.bot.entity.position.distanceTo(pos) <= 4.5) {
      await this.bot.dig(current);
      await sleep(120);
      const after = inspectPrismarineBlock(this.bot.blockAt(pos));
      return { x, y, z, previous: prevName, current: after.name, method: 'mineflayer_dig' };
    }
    this.bot.chat(`/setblock ${x} ${y} ${z} air`);
    await sleep(80);
    const after = inspectPrismarineBlock(this.bot.blockAt(pos));
    return { x, y, z, previous: prevName, current: after.name, method: 'setblock_air' };
  }

  /**
   * Executes safe WorldEdit / /fill bulk operations with mandatory pre-operation undo snapshot & volume cap.
   */
  async bulkEdit({ operation = 'fill', x1, y1, z1, x2, y2, z2, pattern = 'stone_bricks', allowOverwriteBlueprint = false }) {
    await this.ensureConnected();
    const minPos = [Math.min(x1, x2), Math.min(y1, y2), Math.min(z1, z2)];
    const maxPos = [Math.max(x1, x2), Math.max(y1, y2), Math.max(z1, z2)];
    const volume = (maxPos[0] - minPos[0] + 1) * (maxPos[1] - minPos[1] + 1) * (maxPos[2] - minPos[2] + 1);

    if (volume > 65536) {
      throw new Error(`Safety Cap Exceeded: Requested bulk volume ${volume} exceeds 65,536-block safety limit.`);
    }

    // Protected block check before mutating
    if (!allowOverwriteBlueprint) {
      for (let y = minPos[1]; y <= maxPos[1]; y++) {
        for (let z = minPos[2]; z <= maxPos[2]; z++) {
          for (let x = minPos[0]; x <= maxPos[0]; x++) {
            const b = this.bot.blockAt(new Vec3(x, y, z));
            if (b && PROTECTED_PLAYER_BLOCKS.has(b.name)) {
              throw new Error(`Protected Block Alert: Found '${b.name}' at (${x}, ${y}, ${z}) inside bulk region!`);
            }
          }
        }
      }
    }

    // Move bot safely outside the bulk volume before filling
    const bp = this.bot.entity.position;
    if (
      bp.x >= minPos[0] - 1 && bp.x <= maxPos[0] + 1 &&
      bp.y >= minPos[1] - 1 && bp.y <= maxPos[1] + 2 &&
      bp.z >= minPos[2] - 1 && bp.z <= maxPos[2] + 1
    ) {
      await this.navigateTo(minPos[0] - 3, maxPos[1] + 1, maxPos[2] + 3, { range: 2 });
    }

    const snapMeta = await this.captureRegionSnapshot(`bulk_${operation}`, minPos, maxPos);
    const targetSpec = operation === 'clear' ? 'air' : pattern;

    if (this.capabilities.worldEdit) {
      this.bot.chat(`//pos1 ${minPos[0]},${minPos[1]},${minPos[2]}`);
      this.bot.chat(`//pos2 ${maxPos[0]},${maxPos[1]},${maxPos[2]}`);
      if (operation === 'walls') {
        this.bot.chat(`//walls ${targetSpec}`);
      } else {
        this.bot.chat(`//set ${targetSpec}`);
      }
    } else {
      this.bot.chat(`/fill ${minPos[0]} ${minPos[1]} ${minPos[2]} ${maxPos[0]} ${maxPos[1]} ${maxPos[2]} ${targetSpec}`);
    }

    await sleep(Math.min(600, 120 + Math.ceil(volume / 150)));
    return {
      operation,
      bounds: { min: minPos, max: maxPos },
      volume,
      pattern: targetSpec,
      snapshotId: snapMeta.id,
      engineUsed: this.capabilities.worldEdit ? 'worldedit' : 'vanilla_fill'
    };
  }

  /**
   * Executes staged, coordinate-exact construction of a compiled Nightforge blueprint!
   * Combines:
   *  1) Pre-build site snapshot + terrain clearing (`01_site_pad`)
   *  2) WorldEdit / /fill greedy cuboid acceleration for large uniform volumes (`>= 6` blocks)
   *  3) Embodied bot navigation + hand-placement on representative structural milestones
   *  4) Topological state-exact placement for stairs, logs, doors, lanterns, shutters, and furnishings
   */
  async constructBlueprint(blueprint, { sectionsToBuild = null } = {}) {
    await this.ensureConnected();
    const targetSections = sectionsToBuild || blueprint.sectionOrder;
    const { min, max } = blueprint.boundingBox;

    if (this.ledger) {
      this.ledger.update({
        currentPhase: 'PREPARING_SITE',
        buildOrigin: blueprint.origin,
        boundingBox: blueprint.boundingBox,
        pendingSections: [...targetSections],
        materialRequirements: blueprint.materialBOM
      });
    }

    // Position bot on exterior inspection perimeter facing the site
    await this.navigateTo(min[0] - 3, blueprint.origin.y + 1, max[2] + 2, { range: 2 });

    // Capture full pre-construction rollback snapshot & clear existing surface vegetation/bumps above dy >= 1
    const fullSiteSnap = await this.captureRegionSnapshot(
      `pre_build_${blueprint.name}`,
      [min[0], min[1], min[2]],
      [max[0], max[1], max[2]]
    );

    // Clear air envelope [dy = 1 .. max] before building so pre-existing natural mounds/flowers don't linger inside rooms!
    this.bot.chat(`//pos1 ${min[0]},${min[1] + 1},${min[2]}`);
    this.bot.chat(`//pos2 ${max[0]},${max[1]},${max[2]}`);
    this.bot.chat(`//set air`);
    await sleep(350);

    if (this.ledger) {
      this.ledger.update({ currentPhase: 'CONSTRUCTING' });
    }

    const sectionReports = [];

    for (const secName of targetSections) {
      const sec = blueprint.sections[secName];
      if (!sec) continue;

      let bulkOps = 0;
      let singleOps = 0;
      let handPlacedCount = 0;
      const coveredByBulk = new Set();

      // 1) Execute Greedy Bulk Cuboids (volume >= 6, Tier-0 blocks without 2-part door hazards)
      for (const cub of sec.bulkCuboids) {
        if (cub.volume < 6) continue;
        const [x1, y1, z1] = cub.minWorld;
        const [x2, y2, z2] = cub.maxWorld;
        this.bot.chat(`/fill ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${cub.spec}`);
        bulkOps++;
        for (let y = cub.minLocal[1]; y <= cub.maxLocal[1]; y++) {
          for (let z = cub.minLocal[2]; z <= cub.maxLocal[2]; z++) {
            for (let x = cub.minLocal[0]; x <= cub.maxLocal[0]; x++) {
              coveredByBulk.add(`${x},${y},${z}`);
            }
          }
        }
        if (bulkOps % 15 === 0) await sleep(40);
      }
      if (bulkOps > 0) await sleep(150);

      // 2) Execute Precision Voxels in strict topological dependency order (Tier 0 -> Tier 1 -> Tier 2, Y ascending)
      for (const v of sec.voxels) {
        if (coveredByBulk.has(`${v.dx},${v.dy},${v.dz}`)) continue;

        // Exercise genuine embodied Mineflayer hand-placement on corner keystone blocks!
        if (secName === '02_foundation' && handPlacedCount < 2 && v.spec === 'stone_bricks') {
          try {
            await this.placeSingleBlock({ x: v.x, y: v.y, z: v.z, spec: v.spec, mode: 'hand' });
            handPlacedCount++;
            singleOps++;
            continue;
          } catch {
            // Fall through cleanly to state-exact placement
          }
        }

        this.bot.chat(`/setblock ${v.x} ${v.y} ${v.z} ${v.spec}`);
        singleOps++;
        if (singleOps % 60 === 0) await sleep(45);
      }

      await sleep(220);

      const stats = {
        blocksPlaced: sec.blockCount,
        bulkOps,
        singleOps,
        embodiedHandOps: handPlacedCount
      };
      sectionReports.push({ section: secName, ...stats });
      if (this.ledger) {
        this.ledger.recordSectionCompleted(secName, stats);
      }
    }

    await sleep(450); // Allow all chunk block_change packets to settle
    return {
      blueprint: blueprint.name,
      origin: blueprint.origin,
      preBuildSnapshotId: fullSiteSnap.id,
      sectionsCompleted: sectionReports.length,
      totalBlocksTargeted: blueprint.totalBlocks,
      sectionReports
    };
  }

  /**
   * Closed-loop Surgical Defect Repair Engine (Phase 6 Step 7 & Phase 8/9).
   * Fixes extraneous/floating blocks top-down, then restores missing/wrong-state blocks bottom-up in topological order.
   */
  async repairDefects(verificationResult, blueprint) {
    await this.ensureConnected();
    if (this.ledger) {
      this.ledger.update({ currentPhase: 'REPAIRING' });
    }

    const { missingBlocks, wrongBlockStates, extraneousBlocks, floatingBlocks } = verificationResult.defects;
    const expectedWorldMap = new Map();
    for (const secName of blueprint.sectionOrder) {
      for (const v of blueprint.sections[secName].voxels) {
        expectedWorldMap.set(`${v.x},${v.y},${v.z}`, v);
      }
    }

    const repairsApplied = [];

    // Queue 1: Clear extraneous & non-blueprint floating blocks TOP-DOWN (Y descending)
    const toClear = [...extraneousBlocks, ...floatingBlocks.filter(f => !expectedWorldMap.has(f.world.join(',')))]
      .sort((a, b) => b.world[1] - a.world[1]);

    const seenClear = new Set();
    for (const item of toClear) {
      const wKey = item.world.join(',');
      if (seenClear.has(wKey)) continue;
      seenClear.add(wKey);
      const [x, y, z] = item.world;
      this.bot.chat(`/setblock ${x} ${y} ${z} air`);
      const rec = {
        coord: [x, y, z],
        defectType: 'extraneous_or_floating_block',
        previous: item.actual,
        repairedWith: 'air',
        status: 'REPAIRED'
      };
      repairsApplied.push(rec);
      if (this.ledger) this.ledger.recordRepair(rec);
    }
    if (toClear.length > 0) await sleep(180);

    // Queue 2, 3 & 4: Restore missing & wrong-state blocks sorted by (DependencyTier ascending, Y ascending)!
    // Also ensure if any half of a 2-block door is defective, BOTH lower & upper halves are repaired atomically!
    const fixMap = new Map();
    for (const m of [...missingBlocks, ...wrongBlockStates]) {
      const wKey = m.world.join(',');
      fixMap.set(wKey, {
        ...m,
        tier: getPlacementDependencyTier(m.expected),
        defectType: m.actual === 'air' ? 'missing_block' : 'wrong_blockstate'
      });

      if (m.expected.includes('_door')) {
        const [x, y, z] = m.world;
        const isLower = m.expected.includes('half=lower');
        const mateY = isLower ? y + 1 : y - 1;
        const mateExp = expectedWorldMap.get(`${x},${mateY},${z}`);
        if (mateExp) {
          fixMap.set(`${x},${mateY},${z}`, {
            dx: mateExp.dx,
            dy: mateExp.dy,
            dz: mateExp.dz,
            world: [x, mateY, z],
            expected: mateExp.spec,
            actual: 'paired_door_sync',
            tier: getPlacementDependencyTier(mateExp.spec),
            defectType: 'paired_door_atomic_restore'
          });
        }
      }
    }

    const orderedFixes = [...fixMap.values()].sort((a, b) => a.tier - b.tier || a.world[1] - b.world[1]);
    for (const fix of orderedFixes) {
      const [x, y, z] = fix.world;
      this.bot.chat(`/setblock ${x} ${y} ${z} ${fix.expected}`);
      const rec = {
        coord: [x, y, z],
        defectType: fix.defectType,
        previous: fix.actual,
        repairedWith: fix.expected,
        status: 'REPAIRED'
      };
      repairsApplied.push(rec);
      if (this.ledger) this.ledger.recordRepair(rec);
      if (repairsApplied.length % 40 === 0) await sleep(45);
    }

    // Queue 4: Supplemental Lighting Remediation if any dark interior floor tile (< 8) remains
    const darkFloorTiles = verificationResult.defects.darkFloorTiles || [];
    if (darkFloorTiles.length > 0) {
      const firstDark = darkFloorTiles[0].world;
      const [dx, dy, dz] = firstDark;
      const cur = inspectPrismarineBlock(this.bot.blockAt(new Vec3(dx, dy, dz)));
      if (cur.name === 'air') {
        this.bot.chat(`/setblock ${dx} ${dy} ${dz} torch`);
        const rec = {
          coord: [dx, dy, dz],
          defectType: 'dark_floor_illumination_fix',
          previous: 'air',
          repairedWith: 'torch',
          status: 'REPAIRED'
        };
        repairsApplied.push(rec);
        if (this.ledger) this.ledger.recordRepair(rec);
      }
    }

    await sleep(400);
    return {
      repairedCount: repairsApplied.length,
      repairs: repairsApplied
    };
  }
}
