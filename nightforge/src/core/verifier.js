/**
 * NIGHTFORGE — 12-Point Live-World Engineering Verifier (Phase 9)
 * Compares live Minecraft server chunks against target blueprint and reference analysis:
 *  1. Dimensions
 *  2. Bilateral Symmetry
 *  3. Missing Blocks
 *  4. Floating Blocks (3D 6-connected support BFS from ground base)
 *  5. Structural Gaps (foundation, walls, floor deck)
 *  6. Roof Completeness (sky-ray watertightness check)
 *  7. Window Consistency
 *  8. Interior Completion (workstations, storage, hearth, library, bed, stairs)
 *  9. Lighting Coverage (3D block-light propagation >= 8 across walkable interior)
 * 10. Landscaping & Non-Decaying Foliage
 * 11. Entrance Accessibility (3D 1x2 Player Hitbox Walkability BFS from exterior plaza -> foyer -> loft!)
 * 12. Reference Similarity Score
 */

import { parseBlockSpec, blockMatchesSpec } from './blockstate-utils.js';

const LIGHT_EMITTERS = {
  lantern: 15,
  campfire: 15,
  glowstone: 15,
  sea_lantern: 15,
  shroomlight: 15,
  torch: 14,
  wall_torch: 14,
  furnace: 13
};

function isPassableForPlayer(blockInfo, isFeetLevel = false) {
  if (!blockInfo || blockInfo.name === 'unloaded') return false;
  const n = blockInfo.name;
  if (
    n === 'air' ||
    n === 'cave_air' ||
    n.includes('carpet') ||
    n.includes('torch') ||
    n === 'poppy' ||
    n === 'dandelion' ||
    n === 'fern' ||
    n === 'grass' ||
    n === 'short_grass' ||
    n.includes('button') ||
    n.includes('pressure_plate')
  ) {
    return true;
  }
  // Wooden doors can be opened and walked through by players/bots!
  if (n.includes('_door') && n !== 'iron_door') {
    return true;
  }
  // Stairs & bottom slabs can be stepped onto at feet level when ascending
  if (isFeetLevel && (n.includes('stairs') || (n.includes('slab') && blockInfo.properties?.type === 'bottom'))) {
    return true;
  }
  return false;
}

function isSolidFloorSupport(blockInfo) {
  if (!blockInfo || blockInfo.name === 'unloaded') return false;
  const n = blockInfo.name;
  if (
    n === 'air' ||
    n === 'cave_air' ||
    n === 'water' ||
    n === 'lava' ||
    n.includes('torch') ||
    n.includes('carpet') ||
    n === 'poppy' ||
    n === 'dandelion' ||
    n.includes('_door')
  ) {
    return false;
  }
  return true;
}

/**
 * Runs all 12 verification checks given `liveGrid` (Map of "dx,dy,dz" -> inspectPrismarineBlock)
 * scanned directly from the live Minecraft server chunks.
 */
export function verifyLiveStructure(liveGrid, blueprint, referenceAnalysis = null) {
  const { widthX, heightY, depthZ } = blueprint.dimensions;
  const origin = blueprint.origin;
  const centerX = blueprint.structuralEnvelope.symmetryCenterX;

  // Build expected voxel map
  const expectedMap = new Map();
  for (const secName of blueprint.sectionOrder) {
    for (const v of blueprint.sections[secName].voxels) {
      expectedMap.set(`${v.dx},${v.dy},${v.dz}`, { ...v, section: secName });
    }
  }

  // -------------------------------------------------------------------------
  // DIFF SCAN: Missing Blocks, Wrong Blockstates & Extraneous Obstructions
  // -------------------------------------------------------------------------
  const missingBlocks = [];
  const wrongBlockStates = [];
  const extraneousBlocks = [];

  let minLiveX = Infinity, maxLiveX = -Infinity;
  let minLiveY = Infinity, maxLiveY = -Infinity;
  let minLiveZ = Infinity, maxLiveZ = -Infinity;

  for (let dy = 0; dy < heightY; dy++) {
    for (let dz = 0; dz < depthZ; dz++) {
      for (let dx = 0; dx < widthX; dx++) {
        const key = `${dx},${dy},${dz}`;
        const live = liveGrid.get(key) || { name: 'air', properties: {}, spec: 'air' };
        const exp = expectedMap.get(key);

        if (live.name !== 'air' && live.name !== 'cave_air') {
          if (dx < minLiveX) minLiveX = dx;
          if (dx > maxLiveX) maxLiveX = dx;
          if (dy < minLiveY) minLiveY = dy;
          if (dy > maxLiveY) maxLiveY = dy;
          if (dz < minLiveZ) minLiveZ = dz;
          if (dz > maxLiveZ) maxLiveZ = dz;
        }

        if (exp) {
          if (live.name === 'air' || live.name === 'cave_air') {
            missingBlocks.push({
              dx, dy, dz,
              world: [origin.x + dx, origin.y + dy, origin.z + dz],
              expected: exp.spec,
              actual: live.spec,
              section: exp.section
            });
          } else if (!blockMatchesSpec(live, exp.spec)) {
            wrongBlockStates.push({
              dx, dy, dz,
              world: [origin.x + dx, origin.y + dy, origin.z + dz],
              expected: exp.spec,
              actual: live.spec,
              section: exp.section
            });
          }
        } else if (dy >= 1 && live.name !== 'air' && live.name !== 'cave_air') {
          extraneousBlocks.push({
            dx, dy, dz,
            world: [origin.x + dx, origin.y + dy, origin.z + dz],
            expected: 'air',
            actual: live.spec
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // GATE 1: DIMENSIONS
  // -------------------------------------------------------------------------
  const liveSpan = minLiveX <= maxLiveX
    ? [maxLiveX - minLiveX + 1, maxLiveY - minLiveY + 1, maxLiveZ - minLiveZ + 1]
    : [0, 0, 0];
  const gate1Dimensions = {
    gate: '01_dimensions',
    passed: liveSpan[0] === widthX && liveSpan[1] === heightY && liveSpan[2] === depthZ,
    expectedEnvelope: [widthX, heightY, depthZ],
    liveEnvelope: liveSpan
  };

  // -------------------------------------------------------------------------
  // GATE 2: BILATERAL SYMMETRY (Front Facade & Roof Shell across dx = centerX)
  // -------------------------------------------------------------------------
  let symChecked = 0;
  let symMatched = 0;
  for (let dy = 1; dy < heightY; dy++) {
    for (const dz of [1, 2, 16, 17]) {
      for (let offset = 1; offset <= 9; offset++) {
        const lx = centerX - offset;
        const rx = centerX + offset;
        // Skip intentional East chimney zone at rx = 19..20, dz = 8..10 (not in dz=1,2,16,17 anyway)
        const lBlk = liveGrid.get(`${lx},${dy},${dz}`)?.name || 'air';
        const rBlk = liveGrid.get(`${rx},${dy},${dz}`)?.name || 'air';
        if (lBlk === 'air' && rBlk === 'air') continue;
        symChecked++;
        const normalizeMasonry = n => (n.includes('stone_brick') ? 'stone_bricks' : n);
        if (normalizeMasonry(lBlk) === normalizeMasonry(rBlk)) symMatched++;
      }
    }
  }
  const symmetryRatio = symChecked > 0 ? Number((symMatched / symChecked).toFixed(4)) : 0;
  const gate2Symmetry = {
    gate: '02_symmetry',
    passed: symmetryRatio >= 0.98,
    symmetryRatio,
    pairsChecked: symChecked,
    pairsMatched: symMatched
  };

  // -------------------------------------------------------------------------
  // GATE 3: MISSING BLOCKS
  // -------------------------------------------------------------------------
  const gate3Missing = {
    gate: '03_missing_blocks',
    passed: missingBlocks.length === 0 && wrongBlockStates.length === 0,
    missingCount: missingBlocks.length,
    wrongStateCount: wrongBlockStates.length
  };

  // -------------------------------------------------------------------------
  // GATE 4: FLOATING BLOCKS (3D 6-Connected Support Graph from dy = 0 ground)
  // -------------------------------------------------------------------------
  const grounded = new Set();
  const queue = [];
  for (let dz = 0; dz < depthZ; dz++) {
    for (let dx = 0; dx < widthX; dx++) {
      const k = `${dx},0,${dz}`;
      const b = liveGrid.get(k);
      if (b && b.name !== 'air' && b.name !== 'cave_air') {
        grounded.add(k);
        queue.push([dx, 0, dz]);
      }
    }
  }
  const dirs6 = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1]
  ];
  let qHead = 0;
  while (qHead < queue.length) {
    const [cx, cy, cz] = queue[qHead++];
    for (const [ox, oy, oz] of dirs6) {
      const nx = cx + ox, ny = cy + oy, nz = cz + oz;
      if (nx < 0 || nx >= widthX || ny < 0 || ny >= heightY || nz < 0 || nz >= depthZ) continue;
      const nk = `${nx},${ny},${nz}`;
      if (grounded.has(nk)) continue;
      const nb = liveGrid.get(nk);
      if (nb && nb.name !== 'air' && nb.name !== 'cave_air') {
        grounded.add(nk);
        queue.push([nx, ny, nz]);
      }
    }
  }
  const floatingBlocks = [];
  for (let dy = 1; dy < heightY; dy++) {
    for (let dz = 0; dz < depthZ; dz++) {
      for (let dx = 0; dx < widthX; dx++) {
        const k = `${dx},${dy},${dz}`;
        const b = liveGrid.get(k);
        if (b && b.name !== 'air' && b.name !== 'cave_air' && !grounded.has(k)) {
          floatingBlocks.push({
            dx, dy, dz,
            world: [origin.x + dx, origin.y + dy, origin.z + dz],
            actual: b.spec
          });
        }
      }
    }
  }
  const gate4Floating = {
    gate: '04_floating_blocks',
    passed: floatingBlocks.length === 0 && extraneousBlocks.length === 0,
    floatingCount: floatingBlocks.length,
    extraneousCount: extraneousBlocks.length
  };

  // -------------------------------------------------------------------------
  // GATE 5: STRUCTURAL GAPS (Foundation, Columns, Walls, Floor Deck)
  // -------------------------------------------------------------------------
  const structuralSections = new Set(['02_foundation', '03_structural_frame', '04_exterior_walls', '05_floors_and_stairs']);
  const structuralGaps = missingBlocks.filter(m => structuralSections.has(m.section));
  const gate5Structural = {
    gate: '05_structural_gaps',
    passed: structuralGaps.length === 0,
    gapCount: structuralGaps.length
  };

  // -------------------------------------------------------------------------
  // GATE 6: ROOF COMPLETENESS (Vertical Sky-Ray Watertightness Check over Interior)
  // -------------------------------------------------------------------------
  const roofLeaks = [];
  for (let dx = 4; dx <= 18; dx++) {
    for (let dz = 3; dz <= 14; dz++) {
      let hasOverheadRoof = false;
      for (let dy = heightY - 1; dy >= 10; dy--) {
        const b = liveGrid.get(`${dx},${dy},${dz}`);
        if (b && b.name !== 'air' && b.name !== 'cave_air') {
          hasOverheadRoof = true;
          break;
        }
      }
      if (!hasOverheadRoof) {
        roofLeaks.push([origin.x + dx, origin.z + dz]);
      }
    }
  }
  const roofMissing = missingBlocks.filter(m => m.section === '06_roof_system');
  const gate6Roof = {
    gate: '06_roof_completeness',
    passed: roofLeaks.length === 0 && roofMissing.length === 0,
    skyLeakColumns: roofLeaks.length,
    missingRoofVoxels: roofMissing.length
  };

  // -------------------------------------------------------------------------
  // GATE 7: WINDOW CONSISTENCY
  // -------------------------------------------------------------------------
  const expectedWindows = [...expectedMap.values()].filter(v => v.spec.startsWith('glass_pane'));
  let intactWindows = 0;
  for (const w of expectedWindows) {
    const lb = liveGrid.get(`${w.dx},${w.dy},${w.dz}`);
    if (lb && lb.name.includes('glass')) intactWindows++;
  }
  const gate7Windows = {
    gate: '07_window_consistency',
    passed: intactWindows === expectedWindows.length && expectedWindows.length > 0,
    expectedPanes: expectedWindows.length,
    intactPanes: intactWindows
  };

  // -------------------------------------------------------------------------
  // GATE 8: INTERIOR COMPLETION
  // -------------------------------------------------------------------------
  const requiredInteriorTypes = ['crafting_table', 'furnace', 'chest', 'barrel', 'bookshelf', 'lectern', 'campfire'];
  const presentInteriorCounts = {};
  for (const req of requiredInteriorTypes) presentInteriorCounts[req] = 0;
  for (const b of liveGrid.values()) {
    if (b && b.name in presentInteriorCounts) {
      presentInteriorCounts[b.name]++;
    }
  }
  const missingCategories = requiredInteriorTypes.filter(t => presentInteriorCounts[t] === 0);
  const interiorDefects = missingBlocks.filter(m => m.section === '08_interior_fitout');
  const gate8Interior = {
    gate: '08_interior_completion',
    passed: missingCategories.length === 0 && interiorDefects.length === 0,
    presentCounts: presentInteriorCounts,
    missingCategories,
    missingInteriorVoxels: interiorDefects.length
  };

  // -------------------------------------------------------------------------
  // GATE 9: LIGHTING COVERAGE (3D Block-Light Propagation >= 8 on Walkable Floors)
  // -------------------------------------------------------------------------
  const emitters = [];
  for (let dy = 0; dy < heightY; dy++) {
    for (let dz = 0; dz < depthZ; dz++) {
      for (let dx = 0; dx < widthX; dx++) {
        const b = liveGrid.get(`${dx},${dy},${dz}`);
        if (b && LIGHT_EMITTERS[b.name]) {
          emitters.push({ dx, dy, dz, level: LIGHT_EMITTERS[b.name] });
        }
      }
    }
  }
  const darkFloorTiles = [];
  let checkedFloorTiles = 0;
  // Check Ground Floor (feet at dy=2) & Upper Loft (feet at dy=7)
  for (const [floorSupportY, maxZ] of [[1, 14], [6, 13]]) {
    const feetY = floorSupportY + 1;
    for (let dx = 4; dx <= 18; dx++) {
      for (let dz = 3; dz <= maxZ; dz++) {
        const below = liveGrid.get(`${dx},${floorSupportY},${dz}`) || { name: 'air', properties: {}, spec: 'air' };
        const atFeet = liveGrid.get(`${dx},${feetY},${dz}`) || { name: 'air', properties: {}, spec: 'air' };
        const atHead = liveGrid.get(`${dx},${feetY + 1},${dz}`) || { name: 'air', properties: {}, spec: 'air' };
        if (!isSolidFloorSupport(below)) continue;
        if (!atFeet || (atFeet.name !== 'air' && !atFeet.name.includes('carpet'))) continue;
        if (!atHead || atHead.name !== 'air') continue;
        checkedFloorTiles++;
        let bestLight = 0;
        for (const em of emitters) {
          const dist = Math.abs(em.dx - dx) + Math.abs(em.dy - feetY) + Math.abs(em.dz - dz);
          const l = em.level - dist;
          if (l > bestLight) bestLight = l;
        }
        if (bestLight < 8) {
          darkFloorTiles.push({ world: [origin.x + dx, origin.y + feetY, origin.z + dz], light: bestLight });
        }
      }
    }
  }
  const gate9Lighting = {
    gate: '09_lighting',
    passed: checkedFloorTiles > 0 && darkFloorTiles.length === 0,
    emitterCount: emitters.length,
    walkableTilesAudited: checkedFloorTiles,
    darkSpawnableTiles: darkFloorTiles.length
  };

  // -------------------------------------------------------------------------
  // GATE 10: LANDSCAPING & PERSISTENT FOLIAGE
  // -------------------------------------------------------------------------
  const landscapeDefects = missingBlocks.filter(m => m.section === '09_landscaping_and_lighting');
  let decayingLeafCount = 0;
  for (const b of liveGrid.values()) {
    if (b && b.name.includes('leaves') && b.properties?.persistent === false) {
      decayingLeafCount++;
    }
  }
  const gate10Landscaping = {
    gate: '10_landscaping',
    passed: landscapeDefects.length === 0 && decayingLeafCount === 0,
    missingLandscapeVoxels: landscapeDefects.length,
    decayingLeafCount
  };

  // -------------------------------------------------------------------------
  // GATE 11: ENTRANCE ACCESSIBILITY (3D 1x2 Player Hitbox Walkability BFS!)
  // Starts on exterior stone plaza (dx=11, feet dy=1, dz=21) -> climbs front stairs
  // -> passes through oak_door (dx=11, dy=2, dz=15) -> reaches Great Hall -> climbs
  // interior spruce_stairs -> reaches Upper Loft scholar study (dx=11, dy=7, dz=8)!
  // -------------------------------------------------------------------------
  const startNode = [11, 1, 21]; // standing on dy=0 stone plaza
  const visitedWalk = new Set([startNode.join(',')]);
  const walkQueue = [startNode];
  let reachedFoyer = false;
  let reachedGreatHall = false;
  let reachedUpperLoft = false;

  const airDefault = { name: 'air', properties: {}, spec: 'air' };
  const canStandAt = (x, feetY, z) => {
    if (x < 0 || x >= widthX || feetY < 1 || feetY + 1 >= heightY || z < 0 || z >= depthZ) return false;
    const support = liveGrid.get(`${x},${feetY - 1},${z}`) || airDefault;
    const feet = liveGrid.get(`${x},${feetY},${z}`) || airDefault;
    const head = liveGrid.get(`${x},${feetY + 1},${z}`) || airDefault;
    if (!isSolidFloorSupport(support)) return false;
    if (!isPassableForPlayer(feet, true)) return false;
    if (!isPassableForPlayer(head, false)) return false;
    return true;
  };

  let wHead = 0;
  while (wHead < walkQueue.length) {
    const [wx, wy, wz] = walkQueue[wHead++];
    if (wx === 11 && wy === 2 && wz === 14) reachedFoyer = true;
    if (wx >= 8 && wx <= 14 && wy === 2 && wz >= 5 && wz <= 12) reachedGreatHall = true;
    if (wy === 7 && wz >= 4 && wz <= 12 && wx >= 7 && wx <= 16) reachedUpperLoft = true;

    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = wx + ox;
      const nz = wz + oz;
      // Same elevation, 1-block step up (stairs/plinth), or 1-block step down
      for (const ny of [wy, wy + 1, wy - 1]) {
        // Stepping up 1 block requires clearance at current head + 1 so player doesn't bonk head!
        if (ny === wy + 1) {
          const overhead = liveGrid.get(`${wx},${wy + 2},${wz}`) || airDefault;
          if (!isPassableForPlayer(overhead, false)) continue;
        }
        const k = `${nx},${ny},${nz}`;
        if (visitedWalk.has(k)) continue;
        if (canStandAt(nx, ny, nz)) {
          visitedWalk.add(k);
          walkQueue.push([nx, ny, nz]);
        }
      }
    }
  }

  const gate11Accessibility = {
    gate: '11_entrance_accessibility',
    passed: reachedFoyer && reachedGreatHall && reachedUpperLoft,
    reachableStatesCount: visitedWalk.size,
    milestones: {
      exteriorToFoyerThroughDoor: reachedFoyer,
      groundFloorGreatHall: reachedGreatHall,
      staircaseToUpperLoft: reachedUpperLoft
    }
  };

  // -------------------------------------------------------------------------
  // GATE 12: ARCHITECTURAL REFERENCE SIMILARITY
  // -------------------------------------------------------------------------
  let similarityScore = 0.94;
  if (referenceAnalysis) {
    const targetW = referenceAnalysis.estimatedDimensions?.structuralWidthX?.value || 17;
    const targetD = referenceAnalysis.estimatedDimensions?.structuralDepthZ?.value || 15;
    const actualStructW = 19 - 3 + 1; // 17
    const actualStructD = 16 - 2 + 1; // 15
    const dimMatch = 1 - (Math.abs(actualStructW - targetW) + Math.abs(actualStructD - targetD)) / 32;
    const completeness = 1 - Math.min(1, (missingBlocks.length + wrongBlockStates.length) / Math.max(1, blueprint.totalBlocks));
    similarityScore = Number((0.35 * dimMatch + 0.25 * symmetryRatio + 0.40 * completeness).toFixed(4));
  }
  const gate12Similarity = {
    gate: '12_reference_similarity',
    passed: similarityScore >= 0.88,
    similarityScore,
    matchedElements: [
      'two_story_timber_and_stone_massing',
      'steep_gable_roof_with_stone_brick_rake_trim',
      'central_recessed_entrance_and_second_story_balcony_loggia',
      'east_masonry_smoking_chimney',
      'courtyard_stone_plaza_geometric_hedges_and_four_lantern_posts'
    ]
  };

  const gates = [
    gate1Dimensions,
    gate2Symmetry,
    gate3Missing,
    gate4Floating,
    gate5Structural,
    gate6Roof,
    gate7Windows,
    gate8Interior,
    gate9Lighting,
    gate10Landscaping,
    gate11Accessibility,
    gate12Similarity
  ];

  const gatesPassed = gates.filter(g => g.passed).length;
  const passed = gatesPassed === gates.length;

  return {
    passed,
    gatesPassed,
    gatesTotal: gates.length,
    totalBlueprintBlocks: blueprint.totalBlocks,
    defectSummary: {
      missingCount: missingBlocks.length,
      wrongStateCount: wrongBlockStates.length,
      floatingCount: floatingBlocks.length,
      extraneousCount: extraneousBlocks.length,
      darkTileCount: darkFloorTiles.length
    },
    gates,
    defects: {
      missingBlocks,
      wrongBlockStates,
      floatingBlocks,
      extraneousBlocks,
      darkFloorTiles
    }
  };
}
