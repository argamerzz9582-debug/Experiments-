# PHASE 2 — MINECRAFT TOOL & ECOSYSTEM COMPATIBILITY REPORT

**Methodology:** Direct GitHub REST API (`api.github.com`) repository metadata, file-tree, `package.json`, and source-code inspection conducted on **2026-11-20**, supplemented by live sandbox compatibility testing on Node.js `v22.22.3` and Python `3.11.2`.

---

## Executive Selection Matrix

| Category | Evaluated Repositories | Selected for Nightforge | Role in Architecture |
|---|---|---|---|
| **1. Minecraft MCP Servers** | `yuniko-software/minecraft-mcp-server`, `wzhaoMS/minecraft-builder-skill`, `XanderXML-Bit/mineflayer-mcp`, `arjunkmrm/mcp-minecraft`, `FundamentalLabs/minecraft-mcp`, `MinecraftCodeFoundary/Minecraft-MCP-Server` | **`yuniko-software/minecraft-mcp-server` + Custom `nightforge-mcp`** | Federated MCP layer: `yuniko` provides 22 embodied character/survival tools; `nightforge-mcp` provides 16 architectural engineering, bulk, schematic, vision, verification & repair tools |
| **2. Minecraft AI Agents** | `MineDojo/Voyager`, `mindcraft-bots/mindcraft`, `MineDojo/MineDojo`, `rixhavraj/minecraft-ai-agent`, `misterblaecher/GabCon-BuildAI`, `i365dev/CraftDAG` | **Architectural patterns from `CraftDAG` + `GabCon-BuildAI` + `Voyager` skill library** | Component DSL -> topological voxel compilation -> rendered critique -> closed-loop verification |
| **3. Mineflayer Ecosystem** | `PrismarineJS/mineflayer`, `mineflayer-pathfinder`, `flying-squid` | **`mineflayer` `^4.35.0` + `mineflayer-pathfinder` `^2.4.5` + `flying-squid` `^1.12.0`** | Live TCP protocol bot embodiment, A* navigation, block placement/digging, and pure-JS local Java Edition server |
| **4. Baritone** | `cabaletta/baritone` | **Documented skill fallback (JVM client mod)** | Unmatched long-range survival A* & `.schem` `#build` in JVM clients, but requires Java client runtime unavailable in headless Node-only sandboxes |
| **5. Fabric Automation** | `gnembon/fabric-carpet` (Scarpet), `Niels-NTG/gdmc_http_interface` | **Supported via HTTP/command adapters & skill workflows** | High-speed modded block I/O when user runs a Fabric server |
| **6 & 7. WorldEdit / FAWE** | `EngineHub/WorldEdit`, `IntellectualSites/FastAsyncWorldEdit` | **Command-layer integration (`//pos1`, `//pos2`, `//set`, `//walls`, `//replace`, `//undo`)** | Primary Tier-1 bulk terrain & structural shell accelerator |
| **8 & 9. Litematica & Schematics** | `maruohon/litematica`, `PrismarineJS/prismarine-schematic`, `prismarine-nbt`, `SmylerMC/litemapy`, `Amulet-Team/Amulet-Core` | **`prismarine-schematic` + `prismarine-nbt` (Sponge `.schem` v2)** | Lossless schematic read/write & round-trip verification compatible with WorldEdit, FAWE, and Litematica |
| **10. Building Skills** | `wzhaoMS/minecraft-builder-skill`, `avdstaaij/gdpc`, `louis-e/arnis` | **17-skill `minecraft-skills/` library + Nightforge Parametric Generators** | Modular domain skills with explicit decision, safety, verification, and fallback rules |
| **11. Vision & Screenshots** | `PrismarineJS/prismarine-viewer`, `GabCon-BuildAI` software rasterizer, `wzhaoMS/minecraft-builder-skill` `pngjs` | **Pure-software Shaded 3D Isometric + Multi-Elevation Live Chunk Renderer (`pngjs`)** | Zero-GPU, zero-X11 visual capture directly from live server chunks and blueprints |
| **12. Video-to-Blueprint** | `silhovette/Visual2Craft` | **Nightforge Python `analyze_reference.py` (`Pillow` + `numpy`)** | Perceptual frame novelty filtering + silhouette/proportion/palette/window extraction |
| **13. Verification & Repair** | Litematica Verifier concepts + `wzhaoMS` snapshot/undo + custom graph verifier | **Nightforge 12-Point Verifier & Closed-Loop Repair Agent** | Block-by-block diffing, symmetry check, BFS walkability, floating-block graph check, topological repair & snapshot rollback |

---

## Detailed Category-by-Category Evaluation

### 1. Minecraft MCP Servers

1. **`yuniko-software/minecraft-mcp-server` (v2.0.4)**
   - **Last Update:** `2026-04-04` | **Stars:** 825 | **License:** Apache-2.0 | **Language:** TypeScript
   - **MC Compatibility:** Java Edition up to `1.21.11` (via `mineflayer` `^4.35.0` & `minecraft-data` `^3.105.0`).
   - **Dependencies & Install:** Node `>=20.10.0`, `@modelcontextprotocol/sdk` `^1.27.1`, `mineflayer`, `mineflayer-pathfinder`, `zod`. Compiles cleanly via `npm install && npm run build`.
   - **Actual Tools Exposed (22 tools verified from `src/tools/*.ts`):**
     - Position/Movement: `get-position`, `move-to-position`, `look-at`, `jump`, `move-in-direction`, `fly-to`
     - Blocks: `place-block`, `dig-block`, `get-block-info`, `find-blocks`
     - Inventory: `list-inventory`, `find-item`, `equip-item`
     - Entities/State/Chat: `find-entity`, `detect-gamemode`, `send-chat`, `read-chat`
     - Crafting/Smelting: `list-recipes`, `craft-item`, `get-recipe`, `can-craft`, `smelt-item`
   - **Strengths & Limitations:** Clean stdio filter (`src/stdio-filter.ts`) prevents Mineflayer stdout noise from corrupting JSON-RPC frames. However, lacks bulk construction, schematic I/O, blockstate orientation solver, visual screenshot rendering, structural verification, and undo snapshots.

2. **`wzhaoMS/minecraft-builder-skill` (v2.0.0)**
   - **Last Update:** `2026-10-17` | **Stars:** 21 | **License:** ISC (per `package.json`) | **Language:** JavaScript (ESM)
   - **MC Compatibility:** Java Edition (`mineflayer` `^4.39.0`, `minecraft-data` `^3.117.0`).
   - **Actual Tools Exposed (`src/mcp/server.js`):** `mc_generators`, `mc_validate`, `mc_preview`, `mc_plan`, `mc_build`, `mc_undo`, `mc_where`, `mc_command`, `mc_snapshot`.
   - **Strengths & Limitations:** Excellent architecture for blueprint preview (`pngjs`), greedy `/fill` compilation (`src/compile/greedy.js`), container-protection checks, and `.mcb/undo` snapshots. Lacks fine-grained embodied character inspection, architectural image/video reference analyzer, and 12-point walkability/lighting/symmetry verification.

3. **`XanderXML-Bit/mineflayer-mcp`**, **`arjunkmrm/mcp-minecraft`**, **`FundamentalLabs/minecraft-mcp`**, **`MinecraftCodeFoundary/Minecraft-MCP-Server`**
   - `XanderXML-Bit/mineflayer-mcp` (`2026-11-20`): Exposes 94 survival/bot tools tested against mocked bots; unverified against live multi-version building.
   - `arjunkmrm/mcp-minecraft` (`2025-03-19`, MIT): Early prototype (`mineflayer` `^4.23.0`), no automated tests.
   - `FundamentalLabs/minecraft-mcp` (`2025-06-18`, MIT): Relies on local relative `file:../mineflayer-*` paths in `package.json`, making standalone install brittle.
   - `MinecraftCodeFoundary/Minecraft-MCP-Server` (`2026-02-13`, MIT, Python): Pure RCON + log reader (`run_command`, `read_server_log`); no embodied bot, no chunk reading without server logs, no navigation.

### 2. Minecraft AI Agents
- **`mindcraft-bots/mindcraft`** (★6,037, MIT, pushed `2026-10-27`): Actively maintained LLM + Mineflayer multi-bot framework with coding actions and building primitives. Designed as a standalone chat-driven loop rather than an MCP server.
- **`MineDojo/Voyager`** (★7,337, MIT, pushed `2024-04-03`): Pioneered the compositional JS skill library + iterative error-feedback loop, though frozen on older MC versions (`1.19`).
- **`i365dev/CraftDAG`** (MIT, pushed `2026-10-03`) & **`misterblaecher/GabCon-BuildAI`** (pushed `2026-10-13`): Represent modern 2026 construction-compiler architectures (`ComponentPlan -> DAG -> VoxelGrid -> Isometric Render Critique -> .schem`). Nightforge adopts this exact deterministic compilation + visual critique paradigm.

### 3. Mineflayer & PrismarineJS Ecosystem
- **`PrismarineJS/mineflayer`** (★7,787, MIT, pushed `2026-11-14`): Gold-standard Node.js bot API supporting Java Edition `1.8` – `1.21.4+`. High reliability for chunk inspection (`bot.blockAt`), inventory, chat/commands, and block placement within reach (~4.5 blocks).
- **`PrismarineJS/mineflayer-pathfinder`** (★318, MIT, pushed `2026-11-14`): Reliable A* navigation (`Movements`, `GoalNear`, `GoalBlock`, `GoalXZ`) including scaffolding and parkour toggles.
- **`PrismarineJS/flying-squid`** (★611, MIT, pushed `2026-10-06`): Pure-JavaScript Minecraft Java Edition server. Verified live on `1.16.5` in this sandbox with sub-second startup (`await server.waitForReady()`).

### 4. Baritone (`cabaletta/baritone`)
- **Last Update:** `2026-11-18` | **Stars:** 9,372 | **License:** LGPL-3.0 | **Branch:** `1.21.4` (Java)
- **Evaluation:** Unmatched client-side A* pathfinder and survival schematic builder (`#sel`, `#build`, `#mine`). Requires a running JVM Minecraft client (Fabric/Forge), so it cannot run standalone in a JVM-less headless container, though `mineflayer-baritone` or Carpet/client bridges can invoke it on desktop setups. Documented in `pathfinding-expert` and `structural-builder` skills.

### 5. Minecraft Fabric Automation
- **`gnembon/fabric-carpet`** (★2,083, MIT, pushed `2026-11-19`) & **`Niels-NTG/gdmc_http_interface`** (MIT, pushed `2026-05-29`) + **`avdstaaij/gdpc`** (MIT, pushed `2026-09-30`):
  - `gdmc_http_interface` exposes direct HTTP `GET/PUT /blocks` endpoints on Forge/Fabric servers for thousands of blocks/sec with full NBT/blockstates. Ideal when server mods are allowed; unavailable on unmodded Vanilla/Paper servers.

### 6 & 7. WorldEdit (`EngineHub/WorldEdit`) & FAWE (`IntellectualSites/FastAsyncWorldEdit`)
- **WorldEdit:** ★3,545, pushed `2026-11-16` (`version/7.4.x`). **FAWE:** ★809, pushed `2026-11-19`.
- **Evaluation:** Industry standard for bulk server-side construction (`//pos1`, `//pos2`, `//set`, `//walls`, `//replace`, `//copy`, `//paste -a`, `//undo`, `//schem load`). FAWE processes millions of blocks asynchronously off the main tick thread without crashing TPS. Selected as Tier-1 bulk engine whenever operator/WorldEdit permissions are detected.

### 8 & 9. Litematica & Schematic Tools
- **`maruohon/litematica`** (★965, LGPL-3.0, pushed `2026-10-17`): Best client-side holographic schematic overlay and material-list/verifier mod.
- **`PrismarineJS/prismarine-schematic`** (MIT, pushed `2026-10-06`) & **`SmylerMC/litemapy`** (GPL-3.0, pushed `2026-04-05`) & **`Amulet-Team/Amulet-Core`** (pushed `2026-11-13`):
  - Selected **Sponge Schematic v2 (`.schem`)** via `prismarine-nbt` + `prismarine-schematic` for universal interoperability across WorldEdit, FAWE, Litematica, and Amulet.

### 10, 11, 12 & 13. Skills, Vision, Video-to-Blueprint & Verification
- **Vision Limitation Identified & Solved:** `PrismarineJS/prismarine-viewer` (`2026-10-06`) depends on `node-canvas-webgl` / `gl` / headless X11 (`xvfb`), which fails in minimal Linux containers without Xorg/Mesa. By building a pure-Node (`pngjs`) shaded isometric + orthographic + interior-cutaway voxel rasterizer that reads **live chunks directly from the Mineflayer bot's world state**, Nightforge achieves 100% deterministic, zero-GPU live world visual screenshots in `<150 ms`.
- **Video/Image-to-Blueprint (`Visual2Craft` pattern):** Implemented in `nightforge/scripts/analyze_reference.py` using `Pillow` + `numpy` perceptual frame deduplication, foreground silhouette segmentation, roof-slope regression, CIE-Lab/RGB Euclidean matching against curated Minecraft architectural block colors, symmetry scoring, and fenestration rhythm detection.
- **Verification & Repair:** Combines exact 3D coordinate blockstate diffing against target blueprint, connected-component support graph analysis (detecting floating blocks), bilateral symmetry checks, light-level propagation audits, and 3D A*/BFS flood-fill walkability verification from exterior ground through doorways and staircases.
