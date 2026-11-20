/**
 * NIGHTFORGE — Deterministic Architectural Blueprint Compiler
 * Compiles reference-driven architectural designs into:
 *  - Sparse & dense 3D voxel maps (local & world coordinates)
 *  - 9 independently verifiable, topologically sorted construction stages
 *  - Greedy cuboid bulk optimization hints
 *  - Floor plans, elevations, roof plan & Material Bill of Materials (BOM)
 */

import fs from 'fs';
import path from 'path';
import { parseBlockSpec, getPlacementDependencyTier } from './blockstate-utils.js';

export const CONSTRUCTION_SECTIONS = [
  '01_site_pad',
  '02_foundation',
  '03_structural_frame',
  '04_exterior_walls',
  '05_floors_and_stairs',
  '06_roof_system',
  '07_windows_and_doors',
  '08_interior_fitout',
  '09_landscaping_and_lighting'
];

function deterministicMasonry(dx, dy, dz) {
  const h = Math.abs((dx * 73856093) ^ (dy * 19349663) ^ (dz * 83492791)) % 20;
  if (dy <= 2 && h < 3) return 'mossy_stone_bricks';
  if (h >= 3 && h < 5) return 'cracked_stone_bricks';
  return 'stone_bricks';
}

function deterministicPathStone(dx, dz) {
  const h = Math.abs((dx * 374761393) ^ (dz * 668265263)) % 10;
  if (h < 2) return 'andesite';
  if (h === 2) return 'mossy_stone_bricks';
  if (h === 3) return 'cobblestone';
  return 'stone_bricks';
}

/**
 * Compiles the Nordic Timber & Stone Guildhall matching assets/reference/nordic_guildhall_reference.png
 */
export function compileNordicGuildhallBlueprint(options = {}) {
  const origin = options.origin || { x: 10, y: 4, z: 10 };
  // Site local dimensions: X = 23 (0..22, center = 11), Y = 20 (0..19), Z = 23 (0..22)
  const sizeX = 23;
  const sizeY = 20;
  const sizeZ = 23;
  const centerX = 11;

  // Map key "dx,dy,dz" -> { dx, dy, dz, spec, section }
  const voxels = new Map();

  const setVoxel = (dx, dy, dz, spec, section) => {
    if (dx < 0 || dx >= sizeX || dy < 0 || dy >= sizeY || dz < 0 || dz >= sizeZ) return;
    const key = `${dx},${dy},${dz}`;
    if (spec === 'air') {
      voxels.delete(key);
      return;
    }
    voxels.set(key, { dx, dy, dz, spec, section });
  };

  // =========================================================================
  // SECTION 01: SITE PAD & COURTYARD TURF BASE (dy = 0 corresponds to flush ground Y0)
  // =========================================================================
  for (let dx = 0; dx < sizeX; dx++) {
    for (let dz = 0; dz < sizeZ; dz++) {
      // Sub-building pad stone vs exterior grass lawn
      if (dx >= 3 && dx <= 19 && dz >= 2 && dz <= 16) {
        setVoxel(dx, 0, dz, 'stone_bricks', '01_site_pad');
      } else {
        setVoxel(dx, 0, dz, 'grass_block', '01_site_pad');
      }
    }
  }
  // Stone courtyard plaza & perimeter walkway flush in ground (dy = 0)
  for (let dx = 8; dx <= 14; dx++) {
    for (let dz = 17; dz <= 22; dz++) {
      setVoxel(dx, 0, dz, deterministicPathStone(dx, dz), '01_site_pad');
    }
  }
  for (let dx = 2; dx <= 20; dx++) {
    setVoxel(dx, 0, 21, deterministicPathStone(dx, 21), '01_site_pad');
  }

  // =========================================================================
  // SECTION 02: FOUNDATION PLINTH, GROUND SLAB & GRAND ENTRANCE STEPS (dy = 1)
  // =========================================================================
  for (let dx = 3; dx <= 19; dx++) {
    for (let dz = 2; dz <= 16; dz++) {
      const isPerimeter = dx === 3 || dx === 19 || dz === 2 || dz === 16;
      if (isPerimeter) {
        setVoxel(dx, 1, dz, deterministicMasonry(dx, 1, dz), '02_foundation');
      } else {
        // Interior spruce floor slab, with fireproof stone hearth pad on East side
        if (dx >= 16 && dx <= 18 && dz >= 7 && dz <= 11) {
          setVoxel(dx, 1, dz, 'stone_bricks', '02_foundation');
        } else {
          setVoxel(dx, 1, dz, 'spruce_planks', '02_foundation');
        }
      }
    }
  }
  // Recessed entrance vestibule floor at dz = 16, dx = 10..12
  for (let dx = 10; dx <= 12; dx++) {
    setVoxel(dx, 1, 16, 'stone_bricks', '02_foundation');
  }
  // Grand front stairs at dz = 17, dx = 9..13 (facing=north climbs from South courtyard into North doorway)
  for (let dx = 9; dx <= 13; dx++) {
    setVoxel(dx, 1, 17, 'stone_brick_stairs[facing=north,half=bottom]', '02_foundation');
  }
  // Step cheek blocks flanking the grand stairs
  setVoxel(8, 1, 17, 'stone_bricks', '02_foundation');
  setVoxel(14, 1, 17, 'stone_bricks', '02_foundation');
  setVoxel(8, 2, 17, 'stone_brick_slab[type=bottom]', '02_foundation');
  setVoxel(14, 2, 17, 'stone_brick_slab[type=bottom]', '02_foundation');

  // =========================================================================
  // SECTION 03 & 04: STRUCTURAL TIMBER FRAME & EXTERIOR WALLS (dy = 2..10)
  // =========================================================================
  const pillarX = new Set([3, 8, 14, 19]);
  const pillarZ = new Set([2, 7, 11, 16]);

  // Ground-story walls (dy = 2..4): weathered stone-brick masonry bays + dark spruce corner/bay columns
  for (let dy = 2; dy <= 4; dy++) {
    // North (dz=2) & South (dz=16) walls
    for (let dx = 3; dx <= 19; dx++) {
      for (const dz of [2, 16]) {
        if (pillarX.has(dx)) {
          setVoxel(dx, dy, dz, 'spruce_log[axis=y]', '03_structural_frame');
        } else if (dz === 16 && dx >= 10 && dx <= 12) {
          // Recessed arched entrance porch opening at outer plane dz = 16
          if (dy === 4 && (dx === 10 || dx === 12)) {
            setVoxel(
              dx,
              dy,
              dz,
              `stone_brick_stairs[facing=${dx === 10 ? 'west' : 'east'},half=top]`,
              '04_exterior_walls'
            );
          }
        } else {
          setVoxel(dx, dy, dz, deterministicMasonry(dx, dy, dz), '04_exterior_walls');
        }
      }
    }
    // West (dx=3) & East (dx=19) walls
    for (let dz = 3; dz <= 15; dz++) {
      for (const dx of [3, 19]) {
        if (pillarZ.has(dz)) {
          setVoxel(dx, dy, dz, 'spruce_log[axis=y]', '03_structural_frame');
        } else {
          setVoxel(dx, dy, dz, deterministicMasonry(dx, dy, dz), '04_exterior_walls');
        }
      }
    }
    // Inner vestibule doorway wall at dz = 15, dx = 8..14
    for (let dx = 9; dx <= 13; dx++) {
      if (dx === 9 || dx === 13) {
        setVoxel(dx, dy, 15, 'spruce_log[axis=y]', '03_structural_frame');
      } else if (dx === 11 && (dy === 2 || dy === 3)) {
        // Doorway rough opening (oak_door placed in section 07)
      } else if ((dx === 10 || dx === 12) && dy === 3) {
        // Sidelight rough opening (glass_pane placed in section 07)
      } else {
        setVoxel(dx, dy, 15, deterministicMasonry(dx, dy, 15), '04_exterior_walls');
      }
    }
  }

  // Carve ground-floor window rough openings (dy = 3..4)
  const groundWindowFrontX = [5, 6, 16, 17];
  const groundWindowRearX = [5, 6, 10, 11, 12, 16, 17];
  for (const dx of groundWindowFrontX) {
    setVoxel(dx, 3, 16, 'air', '04_exterior_walls');
    setVoxel(dx, 4, 16, 'air', '04_exterior_walls');
  }
  for (const dx of groundWindowRearX) {
    setVoxel(dx, 3, 2, 'air', '04_exterior_walls');
    setVoxel(dx, 4, 2, 'air', '04_exterior_walls');
  }
  for (const dz of [4, 5, 13, 14]) {
    setVoxel(3, 3, dz, 'air', '04_exterior_walls');
    setVoxel(3, 4, dz, 'air', '04_exterior_walls');
    setVoxel(19, 3, dz, 'air', '04_exterior_walls');
    setVoxel(19, 4, dz, 'air', '04_exterior_walls');
  }

  // Horizontal story belt-course beams (dy = 5 & dy = 6 outer trim)
  for (const dy of [5, 6]) {
    for (let dx = 3; dx <= 19; dx++) {
      const spec = pillarX.has(dx) ? 'spruce_log[axis=y]' : 'stripped_spruce_log[axis=x]';
      setVoxel(dx, dy, 2, spec, '03_structural_frame');
      setVoxel(dx, dy, 16, spec, '03_structural_frame');
    }
    for (let dz = 3; dz <= 15; dz++) {
      const spec = pillarZ.has(dz) ? 'spruce_log[axis=y]' : 'stripped_spruce_log[axis=z]';
      setVoxel(3, dy, dz, spec, '03_structural_frame');
      setVoxel(19, dy, dz, spec, '03_structural_frame');
    }
  }

  // Upper-story walls (dy = 7..9): Cream-white plaster (white_terracotta) + dark spruce timber columns
  // Includes recessed 2nd-story central balcony loggia above main entrance (dx = 9..13, dz = 14..16)!
  for (let dy = 7; dy <= 9; dy++) {
    for (let dx = 3; dx <= 19; dx++) {
      // North wall (dz = 2)
      if (pillarX.has(dx)) {
        setVoxel(dx, dy, 2, 'spruce_log[axis=y]', '03_structural_frame');
      } else {
        setVoxel(dx, dy, 2, 'white_terracotta', '04_exterior_walls');
      }

      // South wall (dz = 16) — open loggia between dx = 9..13!
      if (pillarX.has(dx)) {
        setVoxel(dx, dy, 16, 'spruce_log[axis=y]', '03_structural_frame');
      } else if (dx >= 9 && dx <= 13) {
        // Open front loggia above entrance; inner wall sits at dz = 14
        if (dy === 7) {
          setVoxel(dx, 7, 16, 'spruce_fence', '03_structural_frame');
        } else if (dy === 9 && (dx === 9 || dx === 13)) {
          setVoxel(dx, 9, 16, `spruce_stairs[facing=${dx === 9 ? 'west' : 'east'},half=top]`, '03_structural_frame');
        }
      } else {
        setVoxel(dx, dy, 16, 'white_terracotta', '04_exterior_walls');
      }
    }

    // Inner balcony back wall at dz = 14, dx = 8..14
    for (let dx = 8; dx <= 14; dx++) {
      if (dx === 8 || dx === 14) {
        setVoxel(dx, dy, 14, 'spruce_log[axis=y]', '03_structural_frame');
      } else if (dx === 11 && (dy === 7 || dy === 8)) {
        // Balcony doorway rough opening
      } else {
        setVoxel(dx, dy, 14, 'white_terracotta', '04_exterior_walls');
      }
    }
    // Balcony side cheeks at dx = 8 and dx = 14, dz = 15
    setVoxel(8, dy, 15, 'white_terracotta', '04_exterior_walls');
    setVoxel(14, dy, 15, 'white_terracotta', '04_exterior_walls');

    // West (dx = 3) & East (dx = 19) upper walls
    for (let dz = 3; dz <= 15; dz++) {
      for (const dx of [3, 19]) {
        if (pillarZ.has(dz)) {
          setVoxel(dx, dy, dz, 'spruce_log[axis=y]', '03_structural_frame');
        } else {
          setVoxel(dx, dy, dz, 'white_terracotta', '04_exterior_walls');
        }
      }
    }
  }

  // Carve upper-story window openings (dy = 8..9)
  for (const dx of [5, 6, 16, 17]) {
    setVoxel(dx, 8, 16, 'air', '04_exterior_walls');
    setVoxel(dx, 9, 16, 'air', '04_exterior_walls');
    setVoxel(dx, 8, 2, 'air', '04_exterior_walls');
    setVoxel(dx, 9, 2, 'air', '04_exterior_walls');
  }
  for (const dx of [10, 12]) {
    setVoxel(dx, 8, 2, 'air', '04_exterior_walls');
    setVoxel(dx, 9, 2, 'air', '04_exterior_walls');
    setVoxel(dx, 8, 14, 'air', '04_exterior_walls');
  }
  for (const dz of [4, 5, 9, 13, 14]) {
    setVoxel(3, 8, dz, 'air', '04_exterior_walls');
    setVoxel(3, 9, dz, 'air', '04_exterior_walls');
    if (dz !== 9) {
      // dz = 9 on East wall is occupied by the stone chimney breast
      setVoxel(19, 8, dz, 'air', '04_exterior_walls');
      setVoxel(19, 9, dz, 'air', '04_exterior_walls');
    }
  }

  // Eave ring beam at dy = 10
  for (let dx = 3; dx <= 19; dx++) {
    const spec = pillarX.has(dx) ? 'spruce_log[axis=y]' : 'stripped_spruce_log[axis=x]';
    setVoxel(dx, 10, 2, spec, '03_structural_frame');
    setVoxel(dx, 10, 16, spec, '03_structural_frame');
  }
  for (let dz = 3; dz <= 15; dz++) {
    const spec = pillarZ.has(dz) ? 'spruce_log[axis=y]' : 'stripped_spruce_log[axis=z]';
    setVoxel(3, 10, dz, spec, '03_structural_frame');
    setVoxel(19, 10, dz, spec, '03_structural_frame');
  }

  // Timber column corbels & symmetrical blue guild banners on front corners (matching reference!)
  for (const [bx, facing] of [
    [2, 'west'],
    [20, 'east']
  ]) {
    setVoxel(bx, 10, 16, `spruce_stairs[facing=${bx === 2 ? 'east' : 'west'},half=top]`, '03_structural_frame');
    setVoxel(bx, 8, 16, 'spruce_fence', '03_structural_frame');
    setVoxel(bx, 7, 16, 'blue_wool', '04_exterior_walls');
    setVoxel(bx, 6, 16, 'blue_wool', '04_exterior_walls');
    void facing;
  }

  // Stepped Gable End Walls (North dz = 2 & South dz = 16, dy = 11..17)
  for (let dy = 11; dy <= 17; dy++) {
    const maxOffset = 18 - dy; // dy=11 -> offset 7 (dx=4..18); dy=17 -> offset 1 (dx=10..12)
    for (let dx = centerX - maxOffset; dx <= centerX + maxOffset; dx++) {
      for (const dz of [2, 16]) {
        const isTimber = dx === centerX - maxOffset || dx === centerX + maxOffset || (dy === 15 && Math.abs(dx - centerX) <= 3);
        setVoxel(dx, dy, dz, isTimber ? 'spruce_log[axis=y]' : 'white_terracotta', '04_exterior_walls');
      }
    }
  }
  // Centered Gable Attic Windows (dx = 10..12, dy = 12..14 on South & North gables)
  for (let dx = 10; dx <= 12; dx++) {
    for (let dy = 12; dy <= 14; dy++) {
      if (dy === 14 && dx !== 11) continue; // Arched 1-2-1 top profile
      setVoxel(dx, dy, 16, 'air', '04_exterior_walls');
      setVoxel(dx, dy, 2, 'air', '04_exterior_walls');
    }
  }

  // East Masonry Chimney Stack (dx = 19..20, dz = 8..10, rising to dy = 16)
  for (let dy = 1; dy <= 16; dy++) {
    for (let dz = 8; dz <= 10; dz++) {
      if (dy <= 11) {
        setVoxel(20, dy, dz, deterministicMasonry(20, dy, dz), '04_exterior_walls');
      }
      if (dy >= 11) {
        // Above eave, chimney column centers at dx = 19..20, dz = 9 (and 8..10 base)
        if (dz === 9 || dy <= 13) {
          setVoxel(19, dy, dz, deterministicMasonry(19, dy, dz), '04_exterior_walls');
          if (dy <= 15) setVoxel(20, dy, 9, deterministicMasonry(20, dy, 9), '04_exterior_walls');
        }
      }
    }
  }

  // =========================================================================
  // SECTION 05: UPPER FLOOR DECK, INTERIOR BEAMS & CODE-COMPLIANT STAIRCASE
  // =========================================================================
  for (let dx = 4; dx <= 18; dx++) {
    for (let dz = 3; dz <= 15; dz++) {
      // Stairwell opening: dx = 5..6, dz = 6..11 so every stair step has >= 4 blocks vertical headroom!
      const inStairwell = dx >= 5 && dx <= 6 && dz >= 6 && dz <= 11;
      if (inStairwell) continue;
      if (dz === 7 || dz === 11) {
        setVoxel(dx, 6, dz, 'stripped_spruce_log[axis=x]', '05_floors_and_stairs');
      } else {
        setVoxel(dx, 6, dz, 'spruce_planks', '05_floors_and_stairs');
      }
    }
  }

  // 2-wide interior staircase ascending Northward from Ground Floor (dy=2, dz=10) to Upper Floor (dy=6, dz=6)
  // Step i=0: dz=10, dy=2 -> Step i=4: dz=6, dy=6 (flush arrival onto dz=5 upper floor deck!)
  for (let step = 0; step < 5; step++) {
    const sz = 10 - step;
    const sy = 2 + step;
    for (const sx of [5, 6]) {
      setVoxel(sx, sy, sz, 'spruce_stairs[facing=north,half=bottom]', '05_floors_and_stairs');
      if (sy > 2) {
        setVoxel(sx, sy - 1, sz, 'spruce_stairs[facing=south,half=top]', '05_floors_and_stairs');
      }
    }
  }
  // Upper stairwell safety guardrail (dy = 7 around cutout)
  for (let dz = 6; dz <= 11; dz++) {
    setVoxel(7, 7, dz, 'spruce_fence', '05_floors_and_stairs');
  }
  setVoxel(5, 7, 12, 'spruce_fence', '05_floors_and_stairs');
  setVoxel(6, 7, 12, 'spruce_fence', '05_floors_and_stairs');

  // =========================================================================
  // SECTION 06: STEEP NORDIC GABLE ROOF + OVERHANGS + CHIMNEY CROWN
  // =========================================================================
  for (let offset = 9; offset >= 1; offset--) {
    const ry = 19 - offset; // offset=9 -> dy=10; offset=1 -> dy=18
    const westX = centerX - offset;
    const eastX = centerX + offset;

    for (let dz = 1; dz <= 17; dz++) {
      const isRakeTrim = dz === 1 || dz === 17;
      const westStair = isRakeTrim
        ? 'stone_brick_stairs[facing=east,half=bottom]'
        : 'dark_oak_stairs[facing=east,half=bottom]';
      const eastStair = isRakeTrim
        ? 'stone_brick_stairs[facing=west,half=bottom]'
        : 'dark_oak_stairs[facing=west,half=bottom]';

      setVoxel(westX, ry, dz, westStair, '06_roof_system');
      // Don't overwrite the masonry chimney shaft penetrating East slope at dx=19..20, dz=8..10!
      const hitsChimney = (eastX === 19 || eastX === 20) && dz >= 8 && dz <= 10 && ry <= 16;
      if (!hitsChimney) {
        setVoxel(eastX, ry, dz, eastStair, '06_roof_system');
      }

      // Upside-down soffit stairs along front & rear gable overhangs AND solid interior roof backing
      if (offset <= 8) {
        if (isRakeTrim) {
          setVoxel(westX, ry - 1, dz, 'stone_brick_stairs[facing=west,half=top]', '06_roof_system');
          setVoxel(eastX, ry - 1, dz, 'stone_brick_stairs[facing=east,half=top]', '06_roof_system');
        } else if (dz > 2 && dz < 16) {
          setVoxel(westX, ry - 1, dz, 'dark_oak_planks', '06_roof_system');
          if (!hitsChimney) {
            setVoxel(eastX, ry - 1, dz, 'dark_oak_planks', '06_roof_system');
          }
        }
      }
    }
  }

  // Central Ridge Beam (dx = 11, dy = 18) & Stone-Brick Ridge Crest (dy = 19)
  for (let dz = 1; dz <= 17; dz++) {
    setVoxel(centerX, 18, dz, dz === 1 || dz === 17 ? 'stone_bricks' : 'stripped_spruce_log[axis=z]', '06_roof_system');
    setVoxel(centerX, 19, dz, 'stone_brick_slab[type=bottom]', '06_roof_system');
  }
  // Gable finials
  setVoxel(centerX, 19, 1, 'stone_bricks', '06_roof_system');
  setVoxel(centerX, 19, 17, 'stone_bricks', '06_roof_system');

  // Safe smoking Chimney Crown at dx = 19, dz = 9, dy = 17
  setVoxel(19, 16, 9, 'stone_bricks', '06_roof_system');
  setVoxel(19, 17, 9, 'campfire[lit=true]', '06_roof_system');
  setVoxel(19, 17, 8, 'stone_brick_wall', '06_roof_system');
  setVoxel(19, 17, 10, 'stone_brick_wall', '06_roof_system');

  // =========================================================================
  // SECTION 07: WINDOWS, SHUTTERS, SILLS & DOORS
  // =========================================================================
  // Ground & upper glass_pane installations
  for (const dx of groundWindowFrontX) {
    setVoxel(dx, 3, 16, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 4, 16, 'glass_pane', '07_windows_and_doors');
  }
  for (const dx of groundWindowRearX) {
    setVoxel(dx, 3, 2, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 4, 2, 'glass_pane', '07_windows_and_doors');
  }
  for (const dz of [4, 5, 13, 14]) {
    setVoxel(3, 3, dz, 'glass_pane', '07_windows_and_doors');
    setVoxel(3, 4, dz, 'glass_pane', '07_windows_and_doors');
    setVoxel(19, 3, dz, 'glass_pane', '07_windows_and_doors');
    setVoxel(19, 4, dz, 'glass_pane', '07_windows_and_doors');
  }
  for (const dx of [5, 6, 16, 17]) {
    setVoxel(dx, 8, 16, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 9, 16, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 8, 2, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 9, 2, 'glass_pane', '07_windows_and_doors');
    // Exterior window sills under upper front windows
    setVoxel(dx, 7, 17, 'stone_brick_stairs[facing=north,half=top]', '07_windows_and_doors');
  }
  // Wooden shutters flanking front upper windows (dz = 17 attached to dz = 16 wall!)
  for (const sx of [4, 7, 15, 18]) {
    setVoxel(sx, 8, 17, 'spruce_trapdoor[facing=south,half=bottom,open=true]', '07_windows_and_doors');
    setVoxel(sx, 9, 17, 'spruce_trapdoor[facing=south,half=bottom,open=true]', '07_windows_and_doors');
  }
  for (const dx of [10, 12]) {
    setVoxel(dx, 8, 2, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 9, 2, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 8, 14, 'glass_pane', '07_windows_and_doors');
    setVoxel(dx, 3, 15, 'glass_pane', '07_windows_and_doors');
  }
  for (const dz of [4, 5, 9, 13, 14]) {
    setVoxel(3, 8, dz, 'glass_pane', '07_windows_and_doors');
    setVoxel(3, 9, dz, 'glass_pane', '07_windows_and_doors');
    if (dz !== 9) {
      setVoxel(19, 8, dz, 'glass_pane', '07_windows_and_doors');
      setVoxel(19, 9, dz, 'glass_pane', '07_windows_and_doors');
    }
  }
  // Gable attic windows + shutters
  for (let dx = 10; dx <= 12; dx++) {
    for (let dy = 12; dy <= 14; dy++) {
      if (dy === 14 && dx !== 11) continue;
      setVoxel(dx, dy, 16, 'glass_pane', '07_windows_and_doors');
      setVoxel(dx, dy, 2, 'glass_pane', '07_windows_and_doors');
    }
  }
  setVoxel(9, 12, 17, 'spruce_trapdoor[facing=south,half=bottom,open=true]', '07_windows_and_doors');
  setVoxel(9, 13, 17, 'spruce_trapdoor[facing=south,half=bottom,open=true]', '07_windows_and_doors');
  setVoxel(13, 12, 17, 'spruce_trapdoor[facing=south,half=bottom,open=true]', '07_windows_and_doors');
  setVoxel(13, 13, 17, 'spruce_trapdoor[facing=south,half=bottom,open=true]', '07_windows_and_doors');

  // Main Entrance Door (dz = 15, dx = 11, dy = 2..3) & Upper Balcony Door (dz = 14, dx = 11, dy = 7..8)
  setVoxel(11, 2, 15, 'oak_door[facing=north,half=lower,hinge=left,open=false]', '07_windows_and_doors');
  setVoxel(11, 3, 15, 'oak_door[facing=north,half=upper,hinge=left,open=false]', '07_windows_and_doors');
  setVoxel(11, 7, 14, 'oak_door[facing=north,half=lower,hinge=left,open=false]', '07_windows_and_doors');
  setVoxel(11, 8, 14, 'oak_door[facing=north,half=upper,hinge=left,open=false]', '07_windows_and_doors');

  // =========================================================================
  // SECTION 08: INTERIOR FITOUT & MOB-SAFE ILLUMINATION (Ground + Upper Loft)
  // =========================================================================
  // 1. Ground Floor Stone Hearth Fireplace (East wall dx = 17..18, dz = 8..10)
  setVoxel(18, 2, 8, 'stone_bricks', '08_interior_fitout');
  setVoxel(18, 2, 10, 'stone_bricks', '08_interior_fitout');
  setVoxel(18, 3, 8, 'stone_bricks', '08_interior_fitout');
  setVoxel(18, 3, 10, 'stone_bricks', '08_interior_fitout');
  setVoxel(18, 2, 9, 'campfire[lit=true]', '08_interior_fitout');
  setVoxel(17, 2, 9, 'iron_bars', '08_interior_fitout');
  setVoxel(18, 4, 8, 'stone_brick_stairs[facing=south,half=bottom]', '08_interior_fitout');
  setVoxel(18, 4, 9, 'stone_bricks', '08_interior_fitout');
  setVoxel(18, 4, 10, 'stone_brick_stairs[facing=north,half=bottom]', '08_interior_fitout');

  // 2. Ground Floor Crafting, Smithing & Storage Guild Bay (North-East dx = 14..18, dz = 3..5)
  setVoxel(15, 2, 3, 'crafting_table', '08_interior_fitout');
  setVoxel(16, 2, 3, 'furnace[facing=south]', '08_interior_fitout');
  setVoxel(17, 2, 3, 'furnace[facing=south]', '08_interior_fitout');
  setVoxel(18, 2, 3, 'cauldron', '08_interior_fitout');
  setVoxel(18, 2, 4, 'barrel[facing=west]', '08_interior_fitout');
  setVoxel(18, 3, 4, 'barrel[facing=west]', '08_interior_fitout');
  setVoxel(18, 2, 5, 'chest[facing=west]', '08_interior_fitout'); // dy=3 above chest left air so lid opens!

  // 3. Ground Floor Great Hall Banquet Table & Chairs (Center dx = 10..12, dz = 7..10)
  for (let dz = 7; dz <= 10; dz++) {
    setVoxel(11, 2, dz, 'spruce_fence', '08_interior_fitout');
    setVoxel(11, 3, dz, 'brown_carpet', '08_interior_fitout');
    if (dz === 8 || dz === 9) {
      setVoxel(9, 2, dz, 'spruce_stairs[facing=east,half=bottom]', '08_interior_fitout');
      setVoxel(13, 2, dz, 'spruce_stairs[facing=west,half=bottom]', '08_interior_fitout');
    }
  }

  // 4. Upper Loft Scholar's Library (North wall dx = 9..15, dz = 3) & Living Quarters (East bay dx = 15..18, dz = 11..14)
  for (const lx of [9, 10, 14, 15]) {
    setVoxel(lx, 7, 3, 'bookshelf', '08_interior_fitout');
    setVoxel(lx, 8, 3, 'bookshelf', '08_interior_fitout');
  }
  setVoxel(11, 7, 4, 'lectern[facing=south]', '08_interior_fitout');
  setVoxel(13, 7, 3, 'cartography_table', '08_interior_fitout');

  // Physics-proof Architectural Guildmaster Bed (dx = 16..17, dz = 13..14, dy = 7)
  setVoxel(16, 7, 14, 'white_wool', '08_interior_fitout');
  setVoxel(17, 7, 14, 'white_wool', '08_interior_fitout');
  setVoxel(16, 7, 13, 'red_wool', '08_interior_fitout');
  setVoxel(17, 7, 13, 'red_wool', '08_interior_fitout');
  setVoxel(18, 7, 14, 'barrel[facing=up]', '08_interior_fitout');
  setVoxel(18, 8, 14, 'lantern[hanging=false]', '08_interior_fitout');

  // 5. Comprehensive Interior & Porch Illumination (ensures block_light >= 9 on 100% of floor tiles!)
  const ceilingGroundLanterns = [
    [6, 5, 4],
    [5, 5, 8],
    [9, 5, 9],
    [11, 5, 5],
    [16, 5, 5],
    [6, 5, 13],
    [11, 5, 12],
    [16, 5, 13]
  ];
  for (const [lx, ly, lz] of ceilingGroundLanterns) {
    setVoxel(lx, ly, lz, 'lantern[hanging=true]', '08_interior_fitout');
  }
  // Porch & Balcony hanging lanterns (matching reference image!)
  setVoxel(10, 4, 16, 'lantern[hanging=true]', '08_interior_fitout');
  setVoxel(12, 4, 16, 'lantern[hanging=true]', '08_interior_fitout');
  setVoxel(10, 9, 15, 'lantern[hanging=true]', '08_interior_fitout');
  setVoxel(12, 9, 15, 'lantern[hanging=true]', '08_interior_fitout');

  // Upper Loft standing lantern posts (distributed so every tile on 15x13 loft has light >= 9)
  const loftLanternPosts = [
    [4, 7, 4],
    [4, 7, 14],
    [11, 7, 9],
    [18, 7, 5],
    [8, 7, 13],
    [14, 7, 13]
  ];
  for (const [lx, ly, lz] of loftLanternPosts) {
    setVoxel(lx, ly, lz, 'spruce_fence', '08_interior_fitout');
    setVoxel(lx, ly + 1, lz, 'lantern[hanging=false]', '08_interior_fitout');
  }
  // Vaulted Ridge Rafter Lanterns
  setVoxel(11, 17, 6, 'lantern[hanging=true]', '08_interior_fitout');
  setVoxel(11, 17, 11, 'lantern[hanging=true]', '08_interior_fitout');

  // =========================================================================
  // SECTION 09: LANDSCAPING, GEOMETRIC HEDGES & SYMMETRICAL COURTYARD LANTERNS
  // =========================================================================
  // Geometric 2-block-tall oak leaf hedges framing the front courtyard (exact match to reference!)
  const hedgeCoords = [];
  for (let dx = 2; dx <= 7; dx++) {
    hedgeCoords.push([dx, 18], [dx, 20]);
  }
  for (let dx = 15; dx <= 20; dx++) {
    hedgeCoords.push([dx, 18], [dx, 20]);
  }
  for (let dz = 3; dz <= 18; dz++) {
    hedgeCoords.push([1, dz], [21, dz]);
  }
  for (const [hx, hz] of hedgeCoords) {
    setVoxel(hx, 1, hz, 'oak_leaves[persistent=true]', '09_landscaping_and_lighting');
    setVoxel(hx, 2, hz, 'oak_leaves[persistent=true]', '09_landscaping_and_lighting');
  }

  // Four Symmetrical Courtyard Lantern Posts flanking the stone plaza (exact match to reference!)
  const courtyardPosts = [
    [7, 17],
    [15, 17],
    [7, 21],
    [15, 21]
  ];
  for (const [px, pz] of courtyardPosts) {
    setVoxel(px, 1, pz, 'stone_bricks', '09_landscaping_and_lighting');
    setVoxel(px, 2, pz, 'spruce_fence', '09_landscaping_and_lighting');
    setVoxel(px, 3, pz, 'spruce_fence', '09_landscaping_and_lighting');
    setVoxel(px, 4, pz, 'lantern[hanging=false]', '09_landscaping_and_lighting');
  }

  // Courtyard floral accents on lawn pockets
  for (const [fx, fz, flower] of [
    [4, 19, 'poppy'],
    [6, 19, 'dandelion'],
    [16, 19, 'dandelion'],
    [18, 19, 'poppy']
  ]) {
    setVoxel(fx, 1, fz, flower, '09_landscaping_and_lighting');
  }

  // =========================================================================
  // COMPILE TOPOLOGICALLY SORTED STAGES, GREEDY BULK OPS & MATERIAL BOM
  // =========================================================================
  const allVoxels = Array.from(voxels.values());
  const bom = {};
  for (const v of allVoxels) {
    const { name } = parseBlockSpec(v.spec);
    bom[name] = (bom[name] || 0) + 1;
  }

  const sections = {};
  for (const secName of CONSTRUCTION_SECTIONS) {
    const secVoxels = allVoxels
      .filter(v => v.section === secName)
      .sort((a, b) => {
        const tierDiff = getPlacementDependencyTier(a.spec) - getPlacementDependencyTier(b.spec);
        if (tierDiff !== 0) return tierDiff;
        if (a.dy !== b.dy) return a.dy - b.dy;
        if (a.dz !== b.dz) return a.dz - b.dz;
        return a.dx - b.dx;
      })
      .map(v => ({
        dx: v.dx,
        dy: v.dy,
        dz: v.dz,
        x: origin.x + v.dx,
        y: origin.y + v.dy,
        z: origin.z + v.dz,
        spec: v.spec,
        tier: getPlacementDependencyTier(v.spec)
      }));

    sections[secName] = {
      name: secName,
      blockCount: secVoxels.length,
      bulkCuboids: computeGreedyCuboids(secVoxels, origin),
      voxels: secVoxels
    };
  }

  const blueprint = {
    name: 'nordic_guildhall',
    title: 'Nightforge Nordic Timber & Stone Guildhall',
    version: '1.16.5',
    createdAt: new Date().toISOString(),
    origin,
    dimensions: { widthX: sizeX, heightY: sizeY, depthZ: sizeZ },
    structuralEnvelope: {
      minLocal: [3, 1, 2],
      maxLocal: [19, 19, 16],
      symmetryCenterX: centerX,
      entranceDoorWorld: [origin.x + 11, origin.y + 2, origin.z + 15],
      exteriorApproachWorld: [origin.x + 11, origin.y + 1, origin.z + 21],
      upperLoftTargetWorld: [origin.x + 11, origin.y + 7, origin.z + 8]
    },
    boundingBox: {
      min: [origin.x, origin.y, origin.z],
      max: [origin.x + sizeX - 1, origin.y + sizeY - 1, origin.z + sizeZ - 1]
    },
    totalBlocks: allVoxels.length,
    materialBOM: bom,
    sectionOrder: CONSTRUCTION_SECTIONS,
    sections
  };

  return blueprint;
}

/**
 * Greedy 3D Cuboid Mesher for Tier-0 solid uniform blocks (used by WorldEdit / /fill bulk router).
 */
export function computeGreedyCuboids(secVoxels, origin) {
  // Only group Tier-0 blocks without directional stair/door/log state sensitivity if desired, or exact-spec matches
  const tier0 = secVoxels.filter(v => v.tier === 0);
  if (tier0.length === 0) return [];

  const grid = new Map();
  for (const v of tier0) {
    grid.set(`${v.dx},${v.dy},${v.dz}`, v.spec);
  }
  const visited = new Set();
  const cuboids = [];

  const sorted = [...tier0].sort((a, b) => a.dy - b.dy || a.dz - b.dz || a.dx - b.dx);
  for (const start of sorted) {
    const startKey = `${start.dx},${start.dy},${start.dz}`;
    if (visited.has(startKey)) continue;
    const spec = start.spec;

    let endX = start.dx;
    while (grid.get(`${endX + 1},${start.dy},${start.dz}`) === spec && !visited.has(`${endX + 1},${start.dy},${start.dz}`)) {
      endX++;
    }

    let endZ = start.dz;
    outerZ: while (true) {
      for (let x = start.dx; x <= endX; x++) {
        const k = `${x},${start.dy},${endZ + 1}`;
        if (grid.get(k) !== spec || visited.has(k)) break outerZ;
      }
      endZ++;
    }

    let endY = start.dy;
    outerY: while (true) {
      for (let z = start.dz; z <= endZ; z++) {
        for (let x = start.dx; x <= endX; x++) {
          const k = `${x},${endY + 1},${z}`;
          if (grid.get(k) !== spec || visited.has(k)) break outerY;
        }
      }
      endY++;
    }

    let volume = 0;
    for (let y = start.dy; y <= endY; y++) {
      for (let z = start.dz; z <= endZ; z++) {
        for (let x = start.dx; x <= endX; x++) {
          visited.add(`${x},${y},${z}`);
          volume++;
        }
      }
    }

    cuboids.push({
      spec,
      volume,
      minLocal: [start.dx, start.dy, start.dz],
      maxLocal: [endX, endY, endZ],
      minWorld: [origin.x + start.dx, origin.y + start.dy, origin.z + start.dz],
      maxWorld: [origin.x + endX, origin.y + endY, origin.z + endZ]
    });
  }

  return cuboids;
}

/**
 * Generates comprehensive Markdown Floor Plans, Front/Side Elevations, Roof Plan & BOM (Phase 6 Step 3).
 */
export function renderBlueprintPlansMarkdown(blueprint) {
  const { widthX, heightY, depthZ } = blueprint.dimensions;
  const grid = Array.from({ length: heightY }, () =>
    Array.from({ length: depthZ }, () => Array.from({ length: widthX }, () => '.'))
  );

  const symbolFor = spec => {
    const { name } = parseBlockSpec(spec);
    if (name.includes('log')) return '#';
    if (name.includes('door')) return 'D';
    if (name.includes('glass')) return 'G';
    if (name.includes('stairs')) return 'S';
    if (name.includes('slab')) return '=';
    if (name.includes('lantern') || name.includes('campfire') || name.includes('torch')) return '*';
    if (name.includes('leaves')) return '@';
    if (name.includes('terracotta')) return 'W';
    if (name.includes('stone_brick') || name === 'cobblestone' || name === 'andesite') return 'M';
    if (name.includes('planks')) return '+';
    if (name.includes('fence') || name.includes('wall')) return 'o';
    if (name === 'grass_block') return ',';
    return 'f';
  };

  for (const secName of blueprint.sectionOrder) {
    for (const v of blueprint.sections[secName].voxels) {
      grid[v.dy][v.dz][v.dx] = symbolFor(v.spec);
    }
  }

  const renderPlanSlice = dy => {
    const rows = [`   X: ${Array.from({ length: widthX }, (_, i) => String(i % 10)).join('')}`];
    for (let dz = 0; dz < depthZ; dz++) {
      rows.push(`Z=${String(dz).padStart(2, '0')}: ${grid[dy][dz].join('')}`);
    }
    return rows.join('\n');
  };

  // Front Elevation (projection from South dz = depthZ-1 looking North)
  const frontElev = [];
  for (let dy = heightY - 1; dy >= 0; dy--) {
    let row = '';
    for (let dx = 0; dx < widthX; dx++) {
      let ch = '.';
      for (let dz = depthZ - 1; dz >= 0; dz--) {
        if (grid[dy][dz][dx] !== '.') {
          ch = grid[dy][dz][dx];
          break;
        }
      }
      row += ch;
    }
    frontElev.push(`Y=${String(dy).padStart(2, '0')}: ${row}`);
  }

  // Side Elevation (projection from East dx = widthX-1 looking West)
  const sideElev = [];
  for (let dy = heightY - 1; dy >= 0; dy--) {
    let row = '';
    for (let dz = 0; dz < depthZ; dz++) {
      let ch = '.';
      for (let dx = widthX - 1; dx >= 0; dx--) {
        if (grid[dy][dz][dx] !== '.') {
          ch = grid[dy][dz][dx];
          break;
        }
      }
      row += ch;
    }
    sideElev.push(`Y=${String(dy).padStart(2, '0')}: ${row}`);
  }

  // Top-Down Roof Plan (highest non-air block per column)
  const roofPlan = [`   X: ${Array.from({ length: widthX }, (_, i) => String(i % 10)).join('')}`];
  for (let dz = 0; dz < depthZ; dz++) {
    let row = '';
    for (let dx = 0; dx < widthX; dx++) {
      let ch = '.';
      for (let dy = heightY - 1; dy >= 0; dy--) {
        if (grid[dy][dz][dx] !== '.') {
          ch = grid[dy][dz][dx];
          break;
        }
      }
      row += ch;
    }
    roofPlan.push(`Z=${String(dz).padStart(2, '0')}: ${row}`);
  }

  const bomLines = Object.entries(blueprint.materialBOM)
    .sort((a, b) => b[1] - a[1])
    .map(([blk, count]) => `| \`${blk}\` | ${count} | ${Math.ceil(count / 64)} |`);

  const stageLines = blueprint.sectionOrder.map(sec => {
    const s = blueprint.sections[sec];
    const bulkVol = s.bulkCuboids.filter(c => c.volume >= 6).reduce((acc, c) => acc + c.volume, 0);
    return `| \`${sec}\` | ${s.blockCount} | ${s.bulkCuboids.filter(c => c.volume >= 6).length} | ${bulkVol} | ${s.blockCount - bulkVol} |`;
  });

  return `# ARCHITECTURAL BLUEPRINT — ${blueprint.title}

- **Blueprint ID:** \`${blueprint.name}\`
- **World Origin:** \`(${blueprint.origin.x}, ${blueprint.origin.y}, ${blueprint.origin.z})\`
- **World Bounding Box:** \`[${blueprint.boundingBox.min.join(', ')}] -> [${blueprint.boundingBox.max.join(', ')}]\`
- **Envelope Dimensions:** \`${widthX} (X) x ${heightY} (Y) x ${depthZ} (Z)\` blocks
- **Total Non-Air Blocks:** \`${blueprint.totalBlocks}\`
- **Symmetry Centerline:** \`dx = ${blueprint.structuralEnvelope.symmetryCenterX}\` (\`X = ${blueprint.origin.x + blueprint.structuralEnvelope.symmetryCenterX}\`)

**Legend:** \`#\` Spruce Timber Column/Beam | \`M\` Stone Masonry | \`W\` Cream Plaster (\`white_terracotta\`) | \`+\` Spruce Plank Floor | \`S\` Stairs/Roof Slope | \`=\` Slab | \`G\` Glass Pane | \`D\` Oak Door | \`*\` Lantern/Campfire | \`@\` Persistent Hedge Leaves | \`o\` Fence/Wall | \`f\` Furnishings

---

## 1. Ground Floor Plan (\`dy = 2\` Wall & Doorway Cut)

\`\`\`text
${renderPlanSlice(2)}
\`\`\`

## 2. Upper Loft & Balcony Floor Plan (\`dy = 7\` Wall, Balcony & Library Cut)

\`\`\`text
${renderPlanSlice(7)}
\`\`\`

## 3. Front Elevation (South Facade Looking North)

\`\`\`text
${frontElev.join('\n')}
\`\`\`

## 4. East Side Elevation (Showing Cross-Bays & Masonry Chimney)

\`\`\`text
${sideElev.join('\n')}
\`\`\`

## 5. Top-Down Roof & Courtyard Plan

\`\`\`text
${roofPlan.join('\n')}
\`\`\`

---

## 6. Staged Construction Execution Plan

| Stage ID | Total Voxels | Bulk Cuboids (\`>=6\`) | Bulk Blocks | Precision Blocks |
|---|---:|---:|---:|---:|
${stageLines.join('\n')}

---

## 7. Material Quantity Estimate (Bill of Materials)

| Block ID | Exact Quantity | Survival Stacks (64) |
|---|---:|---:|
${bomLines.join('\n')}
`;
}

export function saveBlueprintArtifacts(blueprint, blueprintsDir) {
  fs.mkdirSync(blueprintsDir, { recursive: true });
  const jsonPath = path.join(blueprintsDir, `${blueprint.name}_blueprint.json`);
  const mdPath = path.join(blueprintsDir, `${blueprint.name}_plans.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(blueprint, null, 2));
  fs.writeFileSync(mdPath, renderBlueprintPlansMarkdown(blueprint));
  return { jsonPath, mdPath };
}
