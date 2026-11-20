/**
 * NIGHTFORGE — Sponge Schematic v2 (.schem) Writer & Lossless Round-Trip Verifier
 * Compatible with WorldEdit, FastAsyncWorldEdit (FAWE), Litematica, and Amulet.
 */

import fs from 'fs';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

function encodeVarintArray(values) {
  const bytes = [];
  for (let val of values) {
    while ((val & ~0x7f) !== 0) {
      bytes.push((val & 0x7f) | 0x80);
      val >>>= 7;
    }
    bytes.push(val & 0x7f);
  }
  // Signed int8 array for NBT byteArray
  return bytes.map(b => (b > 127 ? b - 256 : b));
}

function decodeVarintArray(signedBytes, expectedCount) {
  const out = [];
  let i = 0;
  while (i < signedBytes.length && out.length < expectedCount) {
    let value = 0;
    let shift = 0;
    while (true) {
      const b = signedBytes[i++] & 0xff;
      value |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) break;
      shift += 7;
    }
    out.push(value);
  }
  return out;
}

/**
 * Exports a compiled Nightforge blueprint to a gzipped Sponge Schematic v2 (.schem) file.
 */
export function writeSpongeSchematic(blueprint, outputPath) {
  const { widthX, heightY, depthZ } = blueprint.dimensions;
  const paletteMap = new Map([['minecraft:air', 0]]);
  const gridIndices = new Int32Array(widthX * heightY * depthZ); // defaults to 0 (air)

  for (const secName of blueprint.sectionOrder) {
    for (const v of blueprint.sections[secName].voxels) {
      const fullSpec = v.spec.startsWith('minecraft:') ? v.spec : `minecraft:${v.spec}`;
      if (!paletteMap.has(fullSpec)) {
        paletteMap.set(fullSpec, paletteMap.size);
      }
      const palIdx = paletteMap.get(fullSpec);
      // Sponge Schematic v2 index order: (y * Length + z) * Width + x
      const flatIdx = (v.dy * depthZ + v.dz) * widthX + v.dx;
      gridIndices[flatIdx] = palIdx;
    }
  }

  const paletteNbt = {};
  for (const [spec, id] of paletteMap.entries()) {
    paletteNbt[spec] = nbt.int(id);
  }

  const blockDataSigned = encodeVarintArray(gridIndices);

  const rootTag = nbt.comp(
    {
      Version: nbt.int(2),
      DataVersion: nbt.int(2586), // Minecraft 1.16.5 DataVersion
      Width: nbt.short(widthX),
      Height: nbt.short(heightY),
      Length: nbt.short(depthZ),
      PaletteMax: nbt.int(paletteMap.size),
      Palette: nbt.comp(paletteNbt),
      BlockData: nbt.byteArray(blockDataSigned),
      Metadata: nbt.comp({
        Name: nbt.string(blueprint.title || blueprint.name),
        Author: nbt.string('Nightforge Autonomous Engineer'),
        WEOffsetX: nbt.int(0),
        WEOffsetY: nbt.int(0),
        WEOffsetZ: nbt.int(0)
      })
    },
    'Schematic'
  );

  const uncompressed = nbt.writeUncompressed(rootTag);
  const gzipped = zlib.gzipSync(uncompressed);
  fs.writeFileSync(outputPath, gzipped);

  return {
    outputPath,
    bytes: gzipped.length,
    dimensions: [widthX, heightY, depthZ],
    paletteSize: paletteMap.size,
    nonAirBlocks: blueprint.totalBlocks
  };
}

/**
 * Decodes a Sponge .schem file and verifies block-for-block equality against a blueprint.
 */
export async function verifySpongeSchematicRoundTrip(schemPath, blueprint) {
  const buf = fs.readFileSync(schemPath);
  const { parsed } = await nbt.parse(buf);
  const simp = nbt.simplify(parsed);

  const width = simp.Width;
  const height = simp.Height;
  const length = simp.Length;
  const invPalette = new Map();
  for (const [spec, idx] of Object.entries(simp.Palette)) {
    invPalette.set(idx, spec.startsWith('minecraft:') ? spec.slice(10) : spec);
  }

  const indices = decodeVarintArray(simp.BlockData, width * height * length);
  const expectedGrid = new Map();
  for (const secName of blueprint.sectionOrder) {
    for (const v of blueprint.sections[secName].voxels) {
      expectedGrid.set(`${v.dx},${v.dy},${v.dz}`, v.spec);
    }
  }

  let mismatches = 0;
  let decodedNonAir = 0;
  for (let dy = 0; dy < height; dy++) {
    for (let dz = 0; dz < length; dz++) {
      for (let dx = 0; dx < width; dx++) {
        const flatIdx = (dy * length + dz) * width + dx;
        const spec = invPalette.get(indices[flatIdx]) || 'air';
        if (spec !== 'air') decodedNonAir++;
        const exp = expectedGrid.get(`${dx},${dy},${dz}`) || 'air';
        if (spec !== exp) mismatches++;
      }
    }
  }

  return {
    valid: mismatches === 0 && decodedNonAir === blueprint.totalBlocks,
    dimensions: [width, height, length],
    paletteSize: invPalette.size,
    decodedNonAir,
    expectedNonAir: blueprint.totalBlocks,
    mismatches
  };
}
