# NIGHTFORGE — MCP-Powered Autonomous Minecraft Engineering System

**NIGHTFORGE** is an end-to-end autonomous Minecraft architectural engineering, world surveying, reference-to-blueprint compilation, multi-tier construction, software voxel vision, and closed-loop verification & repair system operating over **Model Context Protocol (MCP)** and **Mineflayer**.

---

## Live Verified Capabilities

- **Federated Multi-Server MCP Control Plane (`38` Live MCP Tools):**
  - **`nightforge-mcp` (`16` Autonomous Engineering Tools):** `nf_status`, `nf_survey_site`, `nf_inspect_region`, `nf_navigate`, `nf_place_block`, `nf_break_block`, `nf_inventory`, `nf_entities`, `nf_bulk_edit`, `nf_analyze_reference`, `nf_compile_blueprint`, `nf_build_blueprint`, `nf_render_view`, `nf_verify_structure`, `nf_repair_structure`, `nf_rollback`.
  - **`yuniko-minecraft-mcp` (`22` Embodied Character Tools):** `get-position`, `move-to-position`, `look-at`, `jump`, `move-in-direction`, `fly-to`, `place-block`, `dig-block`, `get-block-info`, `find-blocks`, `list-inventory`, `find-item`, `equip-item`, `find-entity`, `send-chat`, `read-chat`, `detect-gamemode`, `list-recipes`, `craft-item`, `get-recipe`, `can-craft`, `smelt-item`.
- **17-Skill Autonomous Library (`minecraft-skills/` & `minecraft-skills.zip`):**
  - Complete specialist playbooks covering `world-surveyor`, `reference-analyzer`, `architect`, `blueprint-planner`, `block-palette-expert`, `terrain-engineer`, `foundation-builder`, `structural-builder`, `roof-specialist`, `interior-designer`, `landscaping`, `pathfinding-expert`, `worldedit-engineer`, `detail-artist`, `build-verifier`, `repair-agent`, and `recovery-agent`, orchestrated by `MASTER_AGENT.md`.
- **Visual Reference & Video-Frame Analyzer (`nightforge/scripts/analyze_reference.py`):**
  - Perceptual frame-novelty filtering (`Visual2Craft` method) + foreground silhouette proportion measurement, roof slope regression, bilateral symmetry scoring, and RGB-to-Minecraft palette clustering.
- **Deterministic Blueprint & Schematic Compiler (`nightforge/src/core/`):**
  - Compiles semantic architecture into topologically sorted build stages (`01_site_pad` -> `09_landscaping_and_lighting`), greedy bulk cuboids, Markdown floor/elevation/roof plans, Material BOM, and **100% lossless Sponge Schematic v2 (`.schem`)** files compatible with WorldEdit, FAWE, and Litematica.
- **Zero-GPU Live-Chunk Visual Inspector (`nightforge/src/core/world-renderer.js`):**
  - Pure-software (`pngjs`) shaded 3D isometric + South front elevation + East chimney elevation + interior loft/stairs cutaway renderer reading directly from live server chunks.
- **12-Gate Engineering Verifier & Surgical Repair Loop (`verifier.js` + `builder-controller.js`):**
  - Audits dimensions, bilateral symmetry (`282/282` pairs), missing blocks, 3D support-graph floating blocks, structural gaps, sky-ray roof watertightness, window consistency (`94/94`), interior completion, block-light propagation (`>= 8` on all `290` walkable tiles), persistent landscaping, **3D `1x2` player walkability BFS** from exterior plaza through `oak_door` up internal stairs to the upper scholar's loft (`586` reachable states), and reference similarity.

---

## Repository Layout

```text
.
├── mcp.config.json                              # Ready-to-mount MCP configuration (Claude / Cursor / VS Code)
├── minecraft-skills.zip                         # Downloadable ZIP archive of the complete 17-skill library
├── minecraft-skills/                            # Master Agent spec + 17 specialist SKILL.md modules
├── PROGRESS_LEDGER.md & progress-ledger.json    # Persistent autonomous construction & repair ledger
├── reports/
│   ├── PHASE1_TOOL_DISCOVERY.md                 # Host vs. workspace MCP & environment audit
│   ├── PHASE2_COMPATIBILITY_REPORT.md           # 13-category repository-inspected ecosystem report
│   ├── PHASE3_MCP_CONNECTION_REPORT.md          # Live MCP handshake & harmless probe transcripts
│   ├── PHASE6_REFERENCE_TO_BLUEPRINT.md         # Visual analysis, proportion & palette report
│   └── PHASE9_FINAL_VERIFICATION_REPORT.md      # Adversarial defect audit, repair log & 12/12 verification
├── assets/reference/
│   ├── nordic_guildhall_reference.png           # Architectural 3/4 reference input
│   └── reference_analysis.json                  # Extracted visual metrics & block palette mapping
├── blueprints/
│   ├── nordic_guildhall_blueprint.json          # Coordinate-mapped 2,517-block blueprint & greedy cuboids
│   ├── nordic_guildhall.schem                   # Verified Sponge Schematic v2 NBT export
│   └── nordic_guildhall_plans.md                # Floor plans, elevations, roof plan & Material BOM
├── renders/
│   ├── live_world_before_build.png              # Live server chunks before construction
│   ├── blueprint_preview_sheet.png              # Pre-build 4-panel blueprint contact sheet
│   ├── live_world_defect_audit.png              # Live server diagnostic capture with injected defects
│   └── live_world_final_verified.png            # Final live server 12/12 verified contact sheet
└── nightforge/                                  # Executable Node.js + Python Engine & MCP Server
    ├── scripts/analyze_reference.py
    ├── src/server/local-mc-server.js
    ├── src/core/{blockstate-utils,blueprint-compiler,schematic-io,world-renderer,verifier,safety-ledger}.js
    ├── src/bot/builder-controller.js
    ├── src/mcp/{nightforge-mcp-server,mcp-federation-client}.js
    ├── src/orchestrator/autonomous-build-run.js
    ├── src/cli/nightforge.js
    ├── src/web/dashboard-server.js
    └── tests/nightforge.test.js
```

---

## Quick Start

### 1. Run Full End-to-End Autonomous Mission (Local Server + MCP Federation + Build + Repair + Verify)
```bash
cd nightforge
npm install
npm run build:demo
```

### 2. Connect to Any External Minecraft Java Server (Vanilla / Paper / Spigot / Fabric)
Set `MC_HOST`, `MC_PORT`, `MC_USERNAME`, and `MC_VERSION` in `mcp.config.json` or environment variables:
```bash
MC_HOST=play.myserver.local MC_PORT=25565 MC_USERNAME=NightforgeBot MC_VERSION=1.21.1 \
  node nightforge/src/mcp/nightforge-mcp-server.js
```

### 3. Run Unit, Schematic Round-Trip & MCP Protocol Tests
```bash
cd nightforge && npm test
```

### 4. Launch Interactive 3D Voxel Blueprint & Verification Dashboard
```bash
cd nightforge && npm run dashboard
```
