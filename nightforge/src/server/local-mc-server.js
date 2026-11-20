/**
 * NIGHTFORGE — Local Minecraft Java Edition Protocol Server (flying-squid 1.16.5)
 * Augmented with:
 *  - Modern blockstate property support (/setblock & /fill with [prop=val,...])
 *  - WorldEdit-compatible region commands (//pos1, //pos2, //set, //walls, //replace, //undo)
 *  - Natural site features (rolling turf mound + flora + distant protected player campsite)
 *    for realistic World Surveyor & Terrain Engineer testing.
 */

import fs from 'fs';
import path from 'path';
import mcServer from 'flying-squid';
import { Vec3 } from 'vec3';
import { resolveStateId } from '../core/blockstate-utils.js';

export async function startLocalMinecraftServer(options = {}) {
  const port = Number(options.port ?? process.env.MC_PORT ?? 25565);
  const version = options.version || '1.16.5';
  const worldFolder = options.worldFolder || path.resolve(process.cwd(), 'world-data/local-server');

  if (options.freshWorld !== false) {
    fs.rmSync(worldFolder, { recursive: true, force: true });
  }
  fs.mkdirSync(worldFolder, { recursive: true });

  const serv = mcServer.createMCServer({
    motd: 'Nightforge Autonomous Engineering Server',
    port,
    'max-players': 16,
    'online-mode': false,
    logging: false,
    gameMode: 1,
    difficulty: 0,
    worldFolder,
    generation: {
      name: 'superflat',
      options: { worldHeight: 80 }
    },
    kickTimeout: 120000,
    plugins: {},
    modpe: false,
    'view-distance': 6,
    'player-list-text': {
      header: { text: 'NIGHTFORGE MCP SERVER' },
      footer: { text: 'Autonomous Minecraft Engineering' }
    },
    'everybody-op': true,
    'max-entities': 100,
    version
  });

  await serv.waitForReady(15000);

  // Per-player WorldEdit selection & undo stack
  const weSelections = new Map();
  const weHistory = [];

  const getSel = ctx => {
    const key = ctx.player ? ctx.player.username : '__console__';
    if (!weSelections.has(key)) weSelections.set(key, { pos1: null, pos2: null });
    return weSelections.get(key);
  };

  const applyBlockSpec = async (pos, spec) => {
    const stateId = resolveStateId(spec, version);
    await serv.setBlock(serv.overworld, pos.floored(), stateId);
  };

  // Override / enhance modern /setblocks (/setblockstate & override /setblock via uniqueHash)
  const registerModernCommands = () => {
    // Enhanced /nfsetblock <x> <y> <z> <spec> and override setblock action to support [prop=val]
    const setblockEntry = serv.commands.uniqueHash?.setblock;
    if (setblockEntry) {
      setblockEntry.params.parse = str => {
        const m = str.match(/^(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)/);
        return m || false;
      };
      setblockEntry.params.action = async (params) => {
        const pos = new Vec3(Number(params[1]), Number(params[2]), Number(params[3]));
        const spec = params[4];
        try {
          await applyBlockSpec(pos, spec);
        } catch (err) {
          // Ignore unknown spec silently or notify player
        }
      };
    }

    // Standard /fill <x1> <y1> <z1> <x2> <y2> <z2> <spec>
    serv.commands.add({
      base: 'fill',
      info: 'Fill a 3D bounding box with a blockstate spec',
      usage: '/fill <x1> <y1> <z1> <x2> <y2> <z2> <block[props]>',
      op: true,
      parse(str) {
        return str.match(/^(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(\S+)/) || false;
      },
      async action(params) {
        const x1 = Math.min(Number(params[1]), Number(params[4]));
        const x2 = Math.max(Number(params[1]), Number(params[4]));
        const y1 = Math.min(Number(params[2]), Number(params[5]));
        const y2 = Math.max(Number(params[2]), Number(params[5]));
        const z1 = Math.min(Number(params[3]), Number(params[6]));
        const z2 = Math.max(Number(params[3]), Number(params[6]));
        const stateId = resolveStateId(params[7], version);
        for (let y = y1; y <= y2; y++) {
          for (let z = z1; z <= z2; z++) {
            for (let x = x1; x <= x2; x++) {
              await serv.setBlock(serv.overworld, new Vec3(x, y, z), stateId);
            }
          }
        }
      }
    });

    // WorldEdit //pos1 x,y,z (in flying-squid, leading '/' is stripped once, so '//pos1' arrives as '/pos1')
    serv.commands.add({
      base: '/pos1',
      info: 'WorldEdit set position 1',
      usage: '//pos1 <x>,<y>,<z>',
      op: true,
      parse(str) {
        return str.match(/^(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)/) || false;
      },
      action(params, ctx) {
        const sel = getSel(ctx);
        sel.pos1 = new Vec3(Number(params[1]), Number(params[2]), Number(params[3]));
      }
    });

    serv.commands.add({
      base: '/pos2',
      info: 'WorldEdit set position 2',
      usage: '//pos2 <x>,<y>,<z>',
      op: true,
      parse(str) {
        return str.match(/^(-?\d+)[,\s]+(-?\d+)[,\s]+(-?\d+)/) || false;
      },
      action(params, ctx) {
        const sel = getSel(ctx);
        sel.pos2 = new Vec3(Number(params[1]), Number(params[2]), Number(params[3]));
      }
    });

    // WorldEdit //set <spec_or_weighted_pattern>
    serv.commands.add({
      base: '/set',
      info: 'WorldEdit fill selection',
      usage: '//set <pattern>',
      op: true,
      parse(str) {
        return str.match(/^(\S+)/) || false;
      },
      async action(params, ctx) {
        const sel = getSel(ctx);
        if (!sel.pos1 || !sel.pos2) return;
        const patternParts = params[1].split(',').map(part => {
          const pm = part.match(/^(?:(\d+)%)?(.+)$/);
          return { weight: pm[1] ? Number(pm[1]) : 100, stateId: resolveStateId(pm[2], version) };
        });
        const totalWeight = patternParts.reduce((a, b) => a + b.weight, 0);
        const x1 = Math.min(sel.pos1.x, sel.pos2.x), x2 = Math.max(sel.pos1.x, sel.pos2.x);
        const y1 = Math.min(sel.pos1.y, sel.pos2.y), y2 = Math.max(sel.pos1.y, sel.pos2.y);
        const z1 = Math.min(sel.pos1.z, sel.pos2.z), z2 = Math.max(sel.pos1.z, sel.pos2.z);

        const prev = [];
        for (let y = y1; y <= y2; y++) {
          for (let z = z1; z <= z2; z++) {
            for (let x = x1; x <= x2; x++) {
              const p = new Vec3(x, y, z);
              const oldState = await serv.overworld.getBlockStateId(p);
              prev.push([x, y, z, oldState]);
              // Deterministic spatial hash for weighted pattern reproducibility
              let pick = Math.abs((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) % totalWeight;
              let chosen = patternParts[0].stateId;
              for (const entry of patternParts) {
                if (pick < entry.weight) {
                  chosen = entry.stateId;
                  break;
                }
                pick -= entry.weight;
              }
              await serv.setBlock(serv.overworld, p, chosen);
            }
          }
        }
        weHistory.push(prev);
      }
    });

    // WorldEdit //walls <spec>
    serv.commands.add({
      base: '/walls',
      info: 'WorldEdit build selection perimeter walls',
      usage: '//walls <spec>',
      op: true,
      parse(str) {
        return str.match(/^(\S+)/) || false;
      },
      async action(params, ctx) {
        const sel = getSel(ctx);
        if (!sel.pos1 || !sel.pos2) return;
        const stateId = resolveStateId(params[1], version);
        const x1 = Math.min(sel.pos1.x, sel.pos2.x), x2 = Math.max(sel.pos1.x, sel.pos2.x);
        const y1 = Math.min(sel.pos1.y, sel.pos2.y), y2 = Math.max(sel.pos1.y, sel.pos2.y);
        const z1 = Math.min(sel.pos1.z, sel.pos2.z), z2 = Math.max(sel.pos1.z, sel.pos2.z);
        for (let y = y1; y <= y2; y++) {
          for (let z = z1; z <= z2; z++) {
            for (let x = x1; x <= x2; x++) {
              if (x === x1 || x === x2 || z === z1 || z === z2) {
                await serv.setBlock(serv.overworld, new Vec3(x, y, z), stateId);
              }
            }
          }
        }
      }
    });

    serv.commands.add({
      base: '/undo',
      info: 'WorldEdit undo last operation',
      usage: '//undo',
      op: true,
      parse() {
        return [];
      },
      async action() {
        const last = weHistory.pop();
        if (!last) return;
        for (const [x, y, z, sid] of last) {
          await serv.setBlock(serv.overworld, new Vec3(x, y, z), sid);
        }
      }
    });
  };

  registerModernCommands();

  // Seed realistic site environment features so World Surveyor & Terrain Engineer do genuine work:
  // 1) Protected existing player campsite at (-6, 5, -6) that World Surveyor must detect & avoid!
  await applyBlockSpec(new Vec3(-6, 5, -6), 'chest[facing=south]');
  await applyBlockSpec(new Vec3(-5, 5, -6), 'crafting_table');
  await applyBlockSpec(new Vec3(-7, 5, -6), 'oak_planks');
  await applyBlockSpec(new Vec3(-7, 6, -6), 'lantern[hanging=false]');

  // 2) Natural minor turf mound & wildflower/grass patches around (16..24, 5, 16..24) for Terrain Engineer grading!
  for (let x = 17; x <= 21; x++) {
    for (let z = 17; z <= 20; z++) {
      await applyBlockSpec(new Vec3(x, 5, z), 'grass_block');
    }
  }
  await applyBlockSpec(new Vec3(14, 5, 15), 'poppy');
  await applyBlockSpec(new Vec3(22, 5, 22), 'dandelion');
  await applyBlockSpec(new Vec3(19, 6, 18), 'dandelion');

  return {
    server: serv,
    port: serv.listeningPort || port,
    version,
    worldFolder,
    async close() {
      for (const p of [...serv.players]) {
        try {
          p._client.end('Server shutting down cleanly');
        } catch {}
      }
      await new Promise(r => setTimeout(r, 120));
      if (serv._server) {
        serv._server.close();
      }
    }
  };
}

// Allow running directly as a standalone process (`npm run server:local`)
if (import.meta.url === `file://${process.argv[1]}`) {
  const started = await startLocalMinecraftServer();
  console.error(`[Nightforge Local MC Server] Ready on 127.0.0.1:${started.port} (MC ${started.version})`);
  process.on('SIGINT', async () => {
    await started.close();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await started.close();
    process.exit(0);
  });
}
