/**
 * NIGHTFORGE — Blockstate Parser, Serializer & Exact StateId Resolver
 * Compatible across Minecraft Java Edition 1.16.5 - 1.21.x via minecraft-data & prismarine-block.
 */

import mcDataLoader from 'minecraft-data';
import prismarineBlockLoader from 'prismarine-block';

const cache = new Map();

export function getRegistry(version = '1.16.5') {
  if (!cache.has(version)) {
    const mcData = mcDataLoader(version);
    const Block = prismarineBlockLoader(version);
    cache.set(version, { mcData, Block });
  }
  return cache.get(version);
}

/**
 * Parses "minecraft:spruce_stairs[facing=east,half=bottom]" -> { name: "spruce_stairs", properties: { facing: "east", half: "bottom" } }
 */
export function parseBlockSpec(spec) {
  if (!spec || typeof spec !== 'string') {
    return { name: 'air', properties: {} };
  }
  let clean = spec.trim();
  if (clean.startsWith('minecraft:')) {
    clean = clean.slice('minecraft:'.length);
  }
  const bracketIdx = clean.indexOf('[');
  if (bracketIdx === -1) {
    return { name: clean, properties: {} };
  }
  const name = clean.slice(0, bracketIdx).trim();
  const rawProps = clean.slice(bracketIdx + 1, clean.endsWith(']') ? -1 : clean.length);
  const properties = {};
  if (rawProps.trim().length > 0) {
    for (const part of rawProps.split(',')) {
      const [k, v] = part.split('=').map(s => s.trim());
      if (!k || v === undefined) continue;
      if (v === 'true') properties[k] = true;
      else if (v === 'false') properties[k] = false;
      else if (!Number.isNaN(Number(v)) && v !== '') properties[k] = Number(v);
      else properties[k] = v;
    }
  }
  return { name, properties };
}

/**
 * Formats canonical blockstate string with sorted explicit properties.
 */
export function formatBlockSpec(name, properties = {}) {
  const cleanName = name.startsWith('minecraft:') ? name.slice(10) : name;
  const keys = Object.keys(properties).sort();
  if (keys.length === 0) return cleanName;
  const pairs = keys.map(k => `${k}=${properties[k]}`);
  return `${cleanName}[${pairs.join(',')}]`;
}

/**
 * Resolves exact Minecraft numerical stateId for a block spec string.
 */
export function resolveStateId(spec, version = '1.16.5') {
  const { mcData, Block } = getRegistry(version);
  const { name, properties } = parseBlockSpec(spec);
  const blockDef = mcData.blocksByName[name];
  if (!blockDef) {
    throw new Error(`Unknown block '${name}' for Minecraft version ${version}`);
  }
  if (!blockDef.states || blockDef.states.length === 0) {
    return blockDef.defaultState ?? blockDef.minStateId;
  }

  // Start from default state's properties, then override with specified properties
  const defaultBlock = Block.fromStateId(blockDef.defaultState, 0);
  const mergedProps = { ...defaultBlock.getProperties() };
  for (const [k, v] of Object.entries(properties)) {
    if (k in mergedProps) {
      mergedProps[k] = v;
    }
  }
  const resolved = Block.fromProperties(blockDef.id, mergedProps, 0);
  return resolved.stateId;
}

/**
 * Converts a live prismarine Block instance into a normalized { name, stateId, properties, spec } object.
 */
export function inspectPrismarineBlock(block) {
  if (!block) {
    return { name: 'unloaded', stateId: -1, properties: {}, spec: 'unloaded' };
  }
  const props = typeof block.getProperties === 'function' ? block.getProperties() : {};
  return {
    name: block.name,
    stateId: block.stateId,
    properties: props,
    spec: formatBlockSpec(block.name, props)
  };
}

/**
 * Checks whether a live block matches a target blueprint spec on block name and all explicitly specified properties
 * (ignoring auto-computed neighbor connections like fence north/south/east/west or stair shape unless explicitly requested).
 */
export function blockMatchesSpec(liveBlockInfo, targetSpec) {
  if (!liveBlockInfo || liveBlockInfo.name === 'unloaded') return false;
  const target = parseBlockSpec(targetSpec);
  if (liveBlockInfo.name !== target.name) {
    // Grass path / dirt hydration edge tolerance only if grass_block converts under solid block
    if (target.name === 'grass_block' && liveBlockInfo.name === 'dirt') return true;
    return false;
  }
  const dynamicNeighborKeys = new Set(['north', 'south', 'east', 'west', 'up', 'shape', 'powered', 'waterlogged', 'distance']);
  for (const [k, expectedVal] of Object.entries(target.properties)) {
    if (dynamicNeighborKeys.has(k)) continue;
    const actualVal = liveBlockInfo.properties?.[k];
    if (actualVal !== undefined && String(actualVal) !== String(expectedVal)) {
      return false;
    }
  }
  return true;
}

/**
 * Classifies attachment order so support blocks are ALWAYS placed before dependent blocks:
 *  0 = solid / terrain / structural / stairs / slabs
 *  1 = multi-block / floor-standing (doors, flowers, carpets, pressure plates, standing torches/lanterns)
 *  2 = side/ceiling attachments (wall_torch, trapdoors, buttons, hanging lanterns, banners, ladders, signs)
 */
export function getPlacementDependencyTier(spec) {
  const { name, properties } = parseBlockSpec(spec);
  if (name === 'air' || name === 'cave_air') return 0;
  if (
    name.includes('wall_torch') ||
    name.includes('wall_banner') ||
    name.includes('wall_sign') ||
    name.includes('button') ||
    name === 'lever' ||
    name === 'ladder' ||
    name === 'vine' ||
    name.includes('trapdoor') ||
    (name.includes('lantern') && properties.hanging === true)
  ) {
    return 2;
  }
  if (
    name.includes('_door') ||
    name.includes('torch') ||
    name.includes('lantern') ||
    name.includes('carpet') ||
    name.includes('pressure_plate') ||
    name.includes('banner') ||
    name.includes('sign') ||
    name === 'poppy' ||
    name === 'dandelion' ||
    name === 'cornflower' ||
    name === 'fern' ||
    name === 'flower_pot' ||
    name.startsWith('potted_') ||
    name === 'campfire'
  ) {
    return 1;
  }
  return 0;
}
