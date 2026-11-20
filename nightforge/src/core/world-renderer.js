/**
 * NIGHTFORGE — Pure-Software 3D Voxel & Live-Chunk Contact-Sheet Renderer
 * Zero-GPU, zero-X11 PNG renderer (pngjs) producing shaded 3D Isometric,
 * Front Elevation, East Side Elevation, and Interior Cutaway / Top views
 * directly from either a compiled blueprint OR live Mineflayer server chunks.
 */

import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { parseBlockSpec } from './blockstate-utils.js';

const BLOCK_COLORS = {
  grass_block: [108, 152, 62],
  dirt: [134, 96, 67],
  stone: [125, 125, 125],
  stone_bricks: [124, 123, 126],
  mossy_stone_bricks: [104, 124, 92],
  cracked_stone_bricks: [110, 109, 112],
  stone_brick_stairs: [130, 129, 132],
  stone_brick_slab: [138, 137, 140],
  stone_brick_wall: [118, 117, 120],
  cobblestone: [118, 118, 118],
  andesite: [138, 139, 138],
  spruce_log: [62, 41, 21],
  stripped_spruce_log: [115, 89, 52],
  spruce_planks: [116, 86, 49],
  spruce_stairs: [122, 91, 54],
  spruce_fence: [108, 79, 44],
  spruce_trapdoor: [98, 70, 38],
  dark_oak_planks: [67, 43, 21],
  dark_oak_stairs: [74, 48, 24],
  dark_oak_slab: [74, 48, 24],
  oak_planks: [162, 130, 78],
  oak_door: [148, 114, 62],
  white_terracotta: [214, 192, 174],
  birch_planks: [196, 179, 123],
  glass_pane: [152, 204, 224],
  glass: [152, 204, 224],
  oak_leaves: [66, 118, 40],
  lantern: [252, 198, 78],
  campfire: [246, 142, 44],
  torch: [255, 210, 90],
  wall_torch: [255, 210, 90],
  blue_wool: [46, 66, 168],
  red_wool: [168, 42, 38],
  white_wool: [236, 238, 240],
  brown_carpet: [114, 72, 42],
  bookshelf: [156, 118, 72],
  crafting_table: [144, 96, 56],
  furnace: [112, 112, 116],
  barrel: [132, 98, 58],
  chest: [176, 128, 52],
  cauldron: [74, 74, 78],
  iron_bars: [158, 162, 166],
  lectern: [158, 122, 68],
  cartography_table: [112, 82, 52],
  poppy: [224, 48, 42],
  dandelion: [242, 218, 48],
  default: [180, 120, 200]
};

// Minimal crisp 5x7 uppercase bitmap font for panel headers
const FONT_5X7 = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10101', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '11110', '10001', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00100', '00100', '01000', '10000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

function getColor(spec) {
  const { name } = parseBlockSpec(spec);
  return BLOCK_COLORS[name] || BLOCK_COLORS.default;
}

function setPixel(png, x, y, r, g, b, alpha = 255) {
  const ix = x | 0;
  const iy = y | 0;
  if (ix < 0 || ix >= png.width || iy < 0 || iy >= png.height) return;
  const idx = (png.width * iy + ix) << 2;
  if (alpha >= 255) {
    png.data[idx] = Math.max(0, Math.min(255, r | 0));
    png.data[idx + 1] = Math.max(0, Math.min(255, g | 0));
    png.data[idx + 2] = Math.max(0, Math.min(255, b | 0));
    png.data[idx + 3] = 255;
  } else {
    const a = alpha / 255;
    png.data[idx] = Math.round(png.data[idx] * (1 - a) + r * a);
    png.data[idx + 1] = Math.round(png.data[idx + 1] * (1 - a) + g * a);
    png.data[idx + 2] = Math.round(png.data[idx + 2] * (1 - a) + b * a);
    png.data[idx + 3] = 255;
  }
}

function fillRect(png, x, y, w, h, r, g, b, alpha = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPixel(png, px, py, r, g, b, alpha);
    }
  }
}

function drawText(png, x, y, text, r = 240, g = 244, b = 252, scale = 2) {
  const upper = text.toUpperCase();
  let cx = x;
  for (const ch of upper) {
    const glyph = FONT_5X7[ch] || FONT_5X7[' '];
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] === '1') {
          fillRect(png, cx + gx * scale, y + gy * scale, scale, scale, r, g, b);
        }
      }
    }
    cx += 6 * scale;
  }
}

/**
 * Draws a shaded 3D isometric voxel cube at screen (sx, sy) with half-width `tw` and vertical height `th`.
 * Matching front-right 3/4 view angle: +X goes up-right, +Z goes down-left (Wait: in MC South is +Z, East is +X!
 * Looking from South-East (+X, +Z) toward North-West (-X, -Z):
 *  - Moving East (+dx) goes RIGHT and slightly UP!
 *  - Moving South (+dz) goes LEFT-DOWN / FRONT-LEFT!
 * Let's verify against nordic_guildhall_reference.png:
 *  - Front South gable (+Z) faces DOWN-LEFT!
 *  - East Chimney side (+X) faces DOWN-RIGHT!
 * YES! Let's check exact projection for South-Left / East-Right 3/4 view:
 *  - Increasing dx (+East): screenX += tw, screenY += tw/2  (front-left to front-right along South facade!)
 *  - Wait: on South facade (dz = maxZ), dx=0 is West (LEFT) and dx=22 is East (RIGHT)!
 *    If dx goes from 0 -> 22, we want dx=0 on the LEFT and dx=22 on the RIGHT: screenX += tw!
 *    And along the East side (dx=22), dz goes from 22 (front) -> 0 (back/North), going further RIGHT and UP:
 *    So decreasing dz (going North -dz) has screenX += tw*0.8, screenY -= tw*0.45!
 *    Equivalently:
 *      screenX = center + (dx * tw) - (dz * tw * 0.75)  -- wait: if dz decreases, screenX increases (goes right)!
 *      screenY = base + (dx * tw * 0.38) + (dz * tw * 0.48) - (dy * th)
 *    Let's check Painter's Algorithm back-to-front depth sort for camera at (+X_cam? Wait: camera is at South-East, i.e. +X, +Z!):
 *      Wait: if camera is at South-East (+X, +Z):
 *        - West-North (dx=0, dz=0) is FURTHEST BACK!
 *        - South-West (dx=0, dz=22) is on the LEFT!
 *        - North-East (dx=22, dz=0) is on the RIGHT!
 *        - South-East corner (dx=22, dz=22) is CLOSEST to the camera in the front-center!
 *      Let's check screenX for those 4 corners!
 *        - South-West (dx=0, dz=22) on LEFT -> screenX must be SMALL!
 *        - South-East (dx=22, dz=22) in CENTER-RIGHT -> screenX medium!
 *        - North-East (dx=22, dz=0) on FAR RIGHT -> screenX LARGEST!
 *      Formula: `screenX = originX + dx * tw + (maxZ - dz) * tw`? Wait:
 *        - At (dx=0, dz=22): `0 + 0 = 0` (FAR LEFT!)
 *        - At (dx=22, dz=22): `22*tw + 0 = 22*tw` (CENTER!)
 *        - At (dx=22, dz=0): `22*tw + 22*tw = 44*tw` (FAR RIGHT!)
 *        - At (dx=0, dz=0): `0 + 22*tw = 22*tw` (BACK CENTER!)
 *      And `screenY`:
 *        - At (dx=0, dz=0) [back]: SMALLEST Y (top of screen)!
 *        - At (dx=0, dz=22) [left] & (dx=22, dz=0) [right]: MEDIUM Y!
 *        - At (dx=22, dz=22) [closest front corner]: LARGEST Y (bottom of screen)!
 *        Formula: `screenY = originY + (dx + dz) * (tw * 0.5) - dy * th`!!
 *      BINGO!! Check that isometric math:
 *        - Front South Facade (`dz = 16`, `dx = 3..19`): goes from LEFT `(dx=3)` to CENTER-RIGHT `(dx=19)` facing the viewer on the left-front diamond face!
 *        - East Chimney Side (`dx = 19`, `dz = 16..2`): goes from CENTER-RIGHT `(dz=16)` to FAR-RIGHT `(dz=2)` facing the viewer on the right-front diamond face!
 *        - Painter's Algorithm sort order: strictly ascending `(dx + dz)`, then ascending `dy`!!
 *      THAT MATCHES `nordic_guildhall_reference.png` CAMERA ANGLE 100.0%!!
 */
function drawIsoVoxel(png, sx, sy, tw, th, spec) {
  const { name, properties } = parseBlockSpec(spec);
  const base = getColor(spec);
  const isGlass = name.includes('glass');
  const alpha = isGlass ? 145 : 255;

  // Height adjustment for slabs, carpets, flowers
  let voxelH = th;
  let yShift = 0;
  if (name.includes('carpet')) {
    voxelH = Math.max(2, Math.round(th * 0.18));
    yShift = th - voxelH;
  } else if (name.includes('slab') && properties.type !== 'double') {
    voxelH = Math.max(3, Math.round(th * 0.52));
    if (properties.type !== 'top') yShift = th - voxelH;
  } else if (name === 'poppy' || name === 'dandelion' || name.includes('lantern') || name.includes('torch')) {
    voxelH = Math.max(4, Math.round(th * 0.68));
    if (!properties.hanging) yShift = th - voxelH;
  }

  const halfY = Math.max(2, Math.round(tw * 0.5));
  const cy = sy + yShift;

  // Top diamond face: bright sunlight (1.08x)
  const tr = Math.min(255, Math.round(base[0] * 1.08));
  const tg = Math.min(255, Math.round(base[1] * 1.08));
  const tb = Math.min(255, Math.round(base[2] * 1.08));

  // South (+Z) left-facing visible face: warm daylight (0.86x)
  const lr = Math.round(base[0] * 0.86);
  const lg = Math.round(base[1] * 0.86);
  const lb = Math.round(base[2] * 0.86);

  // East (+X) right-facing visible face: cool shadow (0.67x)
  const rr = Math.round(base[0] * 0.67);
  const rg = Math.round(base[1] * 0.67);
  const rb = Math.round(base[2] * 0.67);

  // Rasterize Top Diamond centered horizontally at sx, vertically [cy - halfY .. cy + halfY]
  for (let dy = -halfY; dy <= halfY; dy++) {
    const span = Math.round(tw * (1 - Math.abs(dy) / halfY));
    for (let dx = -span; dx <= span; dx++) {
      const isEdge = Math.abs(dx) === span;
      setPixel(png, sx + dx, cy + dy, isEdge ? tr * 0.82 : tr, isEdge ? tg * 0.82 : tg, isEdge ? tb * 0.82 : tb, alpha);
    }
  }

  // Rasterize Left Face (South +Z face): x in [sx - tw .. sx], top edge drops from cy to cy + halfY
  for (let dx = -tw; dx <= 0; dx++) {
    const topY = cy + Math.round(((tw + dx) / tw) * halfY);
    for (let py = topY; py <= topY + voxelH; py++) {
      const isBorder = dx === -tw || py === topY + voxelH;
      setPixel(png, sx + dx, py, isBorder ? lr * 0.78 : lr, isBorder ? lg * 0.78 : lg, isBorder ? lb * 0.78 : lb, alpha);
    }
  }

  // Rasterize Right Face (East +X face): x in [sx .. sx + tw], top edge rises from cy + halfY to cy
  for (let dx = 0; dx <= tw; dx++) {
    const topY = cy + Math.round(((tw - dx) / tw) * halfY);
    for (let py = topY; py <= topY + voxelH; py++) {
      const isBorder = dx === tw || py === topY + voxelH;
      setPixel(png, sx + dx, py, isBorder ? rr * 0.78 : rr, isBorder ? rg * 0.78 : rg, isBorder ? rb * 0.78 : rb, alpha);
    }
  }

  // Warm emissive bloom dot for lanterns & campfires
  if (name.includes('lantern') || name === 'campfire' || name.includes('torch')) {
    fillRect(png, sx - 2, cy + 1, 5, 5, 255, 238, 150, 210);
  }
}

/**
 * Converts a blueprint into a standard { widthX, heightY, depthZ, voxelList } renderable object.
 */
export function voxelListFromBlueprint(blueprint) {
  const list = [];
  for (const secName of blueprint.sectionOrder) {
    for (const v of blueprint.sections[secName].voxels) {
      list.push({ dx: v.dx, dy: v.dy, dz: v.dz, spec: v.spec });
    }
  }
  return {
    title: blueprint.title || blueprint.name,
    dimensions: blueprint.dimensions,
    voxels: list
  };
}

/**
 * Renders a 4-panel engineering contact sheet PNG (1280 x 920):
 *  - Panel 1 (Top-Left): 3/4 South-East Isometric Shaded Render (matching reference camera!)
 *  - Panel 2 (Top-Right): South Front Elevation (Orthographic with depth shading)
 *  - Panel 3 (Bottom-Left): East Side Elevation (Orthographic showing Chimney & Cross-Bays)
 *  - Panel 4 (Bottom-Right): Interior Cutaway Isometric (sliced at dy <= 8 showing Loft, Stairs & Great Hall!)
 */
export function renderContactSheetPNG(voxelModel, outputPath, subtitle = '') {
  const W = 1280;
  const H = 920;
  const png = new PNG({ width: W, height: H });

  // Dark slate blueprint background
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      setPixel(png, x, y, 20, 26, 36, 255);
    }
  }

  // Top title banner
  fillRect(png, 0, 0, W, 48, 13, 18, 26);
  const clippedTitle = String(voxelModel.title || 'STRUCTURE').slice(0, 40);
  drawText(png, 20, 16, `NIGHTFORGE - ${clippedTitle}`, 235, 242, 255, 2);
  if (subtitle) {
    drawText(png, 860, 16, subtitle.slice(0, 32), 120, 214, 162, 2);
  }

  const panels = [
    { x: 16, y: 60, w: 616, h: 412, label: '1. 3/4 ISOMETRIC EXTERIOR (SE VIEW)' },
    { x: 648, y: 60, w: 616, h: 412, label: '2. SOUTH FRONT ELEVATION' },
    { x: 16, y: 488, w: 616, h: 412, label: '3. EAST SIDE ELEVATION (CHIMNEY)' },
    { x: 648, y: 488, w: 616, h: 412, label: '4. INTERIOR CUTAWAY (LOFT + STAIRS + HALL)' }
  ];

  for (const p of panels) {
    // Sky-gradient card interior
    for (let py = p.y; py < p.y + p.h; py++) {
      const t = (py - p.y) / p.h;
      const r = Math.round(44 + t * 28);
      const g = Math.round(74 + t * 44);
      const b = Math.round(118 + t * 48);
      for (let px = p.x; px < p.x + p.w; px++) {
        setPixel(png, px, py, r, g, b);
      }
    }
    fillRect(png, p.x, p.y, p.w, 28, 16, 22, 32);
    drawText(png, p.x + 12, p.y + 8, p.label, 218, 228, 245, 2);
  }

  const { widthX, heightY, depthZ } = voxelModel.dimensions;
  const voxels = voxelModel.voxels.filter(v => v.spec && v.spec !== 'air' && v.spec !== 'cave_air');

  // --- PANEL 1: Full 3/4 Isometric Render ---
  const p1 = panels[0];
  const tw1 = 10;
  const th1 = 10;
  const isoSorted = [...voxels].sort((a, b) => a.dx + a.dz - (b.dx + b.dz) || a.dy - b.dy || a.dx - b.dx);
  const origin1X = p1.x + 88;
  const origin1Y = p1.y + 178;
  for (const v of isoSorted) {
    const sx = origin1X + v.dx * tw1 + (depthZ - 1 - v.dz) * tw1;
    const sy = origin1Y + Math.round((v.dx + v.dz) * (tw1 * 0.5)) - v.dy * th1;
    drawIsoVoxel(png, sx, sy, tw1, th1, v.spec);
  }

  // --- PANEL 2: South Front Orthographic Elevation (depth-shaded!) ---
  const p2 = panels[1];
  const scale2 = 17;
  const off2X = p2.x + Math.round((p2.w - widthX * scale2) / 2);
  const off2Y = p2.y + 44;
  const gridMap = new Map();
  for (const v of voxels) {
    gridMap.set(`${v.dx},${v.dy},${v.dz}`, v.spec);
  }
  for (let dy = heightY - 1; dy >= 0; dy--) {
    for (let dx = 0; dx < widthX; dx++) {
      let hitSpec = null;
      let hitDz = -1;
      for (let dz = depthZ - 1; dz >= 0; dz--) {
        const s = gridMap.get(`${dx},${dy},${dz}`);
        if (s) {
          hitSpec = s;
          hitDz = dz;
          break;
        }
      }
      if (!hitSpec) continue;
      const base = getColor(hitSpec);
      // Subtle atmospheric depth darkening for recessed planes
      const depthFactor = Math.max(0.62, 1.0 - (depthZ - 1 - hitDz) * 0.035);
      const r = Math.round(base[0] * depthFactor);
      const g = Math.round(base[1] * depthFactor);
      const b = Math.round(base[2] * depthFactor);
      const px = off2X + dx * scale2;
      const py = off2Y + (heightY - 1 - dy) * scale2;
      fillRect(png, px, py, scale2, scale2, r, g, b);
      // Subtle 1px mortar border
      fillRect(png, px, py + scale2 - 1, scale2, 1, r * 0.78, g * 0.78, b * 0.78);
      fillRect(png, px + scale2 - 1, py, 1, scale2, r * 0.78, g * 0.78, b * 0.78);
    }
  }

  // --- PANEL 3: East Side Orthographic Elevation ---
  const p3 = panels[2];
  const scale3 = 17;
  const off3X = p3.x + Math.round((p3.w - depthZ * scale3) / 2);
  const off3Y = p3.y + 44;
  for (let dy = heightY - 1; dy >= 0; dy--) {
    for (let dz = 0; dz < depthZ; dz++) {
      let hitSpec = null;
      let hitDx = -1;
      for (let dx = widthX - 1; dx >= 0; dx--) {
        const s = gridMap.get(`${dx},${dy},${dz}`);
        if (s) {
          hitSpec = s;
          hitDx = dx;
          break;
        }
      }
      if (!hitSpec) continue;
      const base = getColor(hitSpec);
      const depthFactor = Math.max(0.62, 1.0 - (widthX - 1 - hitDx) * 0.035);
      const r = Math.round(base[0] * depthFactor);
      const g = Math.round(base[1] * depthFactor);
      const b = Math.round(base[2] * depthFactor);
      // Display South (front courtyard dz=22) on LEFT and North (dz=0) on RIGHT to match isometric orientation
      const col = depthZ - 1 - dz;
      const px = off3X + col * scale3;
      const py = off3Y + (heightY - 1 - dy) * scale3;
      fillRect(png, px, py, scale3, scale3, r, g, b);
      fillRect(png, px, py + scale3 - 1, scale3, 1, r * 0.78, g * 0.78, b * 0.78);
      fillRect(png, px + scale3 - 1, py, 1, scale3, r * 0.78, g * 0.78, b * 0.78);
    }
  }

  // --- PANEL 4: Interior Cutaway Isometric (Slice roof & front-right upper walls at dy <= 8, peel South/East wall above dy=3) ---
  const p4 = panels[3];
  const cutawayVoxels = isoSorted.filter(v => {
    if (v.dy > 8) return false;
    // Peel front South wall (dz >= 15) and East wall (dx >= 19) above dy=2 to expose Great Hall, Hearth, Stairs & Loft!
    if (v.dz >= 15 && v.dy >= 3 && v.dx >= 4 && v.dx <= 18) return false;
    if (v.dx >= 19 && v.dy >= 4 && v.dz >= 3 && v.dz <= 15) return false;
    return true;
  });
  const origin4X = p4.x + 74;
  const origin4Y = p4.y + 150;
  for (const v of cutawayVoxels) {
    const sx = origin4X + v.dx * tw1 + (depthZ - 1 - v.dz) * tw1;
    const sy = origin4Y + Math.round((v.dx + v.dz) * (tw1 * 0.5)) - v.dy * th1;
    drawIsoVoxel(png, sx, sy, tw1, th1, v.spec);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const buffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, buffer);
  return {
    outputPath,
    width: W,
    height: H,
    bytes: buffer.length,
    renderedVoxels: voxels.length
  };
}
