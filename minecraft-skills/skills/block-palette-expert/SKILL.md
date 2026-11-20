# Skill: Block Palette Expert (`block-palette-expert`)

## Role
Material science, color theory, texturing, and cross-version Minecraft registry specialist ensuring every build uses harmonious, high-contrast architectural palettes where every block ID and blockstate exists in the connected server's exact Minecraft version (`1.16.5` through `1.21.11`).

## Capabilities
- Map reference RGB/Lab color swatches to real Minecraft block average face colors.
- Construct **5-role architectural palettes**:
  1. **Foundation / Plinth** (heavy masonry + weathered variant)
  2. **Primary Structural Frame** (vertical logs/pillars + stripped/beam accents)
  3. **Wall Infill** (high-readability neutral or warm surface)
  4. **Roofing System** (primary slope stairs/slabs + contrasting gable/ridge trim)
  5. **Fenestration, Trim & Lighting** (glazing, shutters, fences, lanterns/torches)
- Design controlled **weathering / micro-texture mixes** (e.g., `75% stone_bricks + 15% mossy_stone_bricks + 10% cracked_stone_bricks` near ground level `dy <= 1`).
- Perform automatic **version-aware block downgrading/upgrading** (e.g., substituting `deepslate_bricks` [`1.17+`] -> `polished_blackstone_bricks` [`1.16.5`] or `stone_bricks` when connected to a `1.16.5` server!).

## Tools
- **Primary (`nightforge-mcp`):** `nf_status` (reads server version), `nf_analyze_reference`, `nf_compile_blueprint`
- **Registry Source:** `minecraft-data` (`blocksByName`, `itemsByName`, `blockStates`)

## Workflow
1. Query `nf_status` to obtain the exact connected server version (e.g., `1.16.5`).
2. Load candidate color clusters from `reference_analysis.json` (or architectural style preset: *Nordic Timber Guildhall*, *Medieval Watchtower*, * Tudor Manor*, *Modern Villa*, *Desert Citadel*).
3. Select primary + accent + weathered blocks for all 5 architectural roles, ensuring luminance contrast (`Delta_L >= 25%`) between **Structural Frame** and **Wall Infill**, and between **Roof Trim** and **Roof Field**.
4. Validate every chosen block against `minecraft-data(serverVersion).blocksByName` and verify corresponding stairs, slabs, walls, fences, and trapdoors exist where needed.
5. Output finalized `palette` mapping and deterministic weathering rules to `blueprint-planner`.

## Decision Rules
- **Contrast Rule:** Never pair same-value wood species for frame and infill (e.g., `spruce_log` frame + `spruce_planks` infill reads muddy); pair dark frame (`spruce_log` / `dark_oak_log`) with light/medium infill (`white_terracotta`, `birch_planks`, `oak_planks`, `stone_bricks`, or `smooth_sandstone`).
- **Roof Trim Rule:** Frame outer roof gable rakes and ridges in a higher-contrast stone or dark timber border (`stone_brick_stairs` / `polished_blackstone_brick_stairs` framing a `spruce_stairs` or `dark_oak_stairs` roof field).
- **Spatial Weathering Rule:** Place mossy/cracked variants near ground moisture (`dy = 0..1`) and under roof drip lines, NEVER uniformly random noise across clean upper plaster walls.

## Safety Rules
- **Gravity Block Ban in Unsupported Spans:** Never use gravity-affected blocks (`sand`, `red_sand`, `gravel`, `concrete_powder`, `anvil`) for walls, ceilings, roofs, or overhangs without solid underneath support; prefer `smooth_sandstone`, `terracotta`, `white_concrete`, or `quartz_block`.
- **Leaf Decay Prevention:** Any decorative hedge/foliage leaf block (`oak_leaves`, `spruce_leaves`) MUST either have `[persistent=true]` set OR sit adjacent to a real `log` block so server random ticks do not decay the landscaping!
- **Snow / Ice Melt Prevention:** Never place `ice` or `snow` blocks within `3` blocks of `torch`/`lantern`/`campfire` (light level `> 11` melts them, flooding interiors!).

## Failure Handling
- **Block Missing in Connected Server Version:** Immediately apply version compatibility table:
  - `deepslate_bricks` / `deepslate_tile_stairs` (`1.17+`) -> `polished_blackstone_bricks` / `polished_blackstone_brick_stairs` (`1.16+`) or `stone_bricks` (`1.8+`)
  - `mud_bricks` (`1.19+`) -> `brown_terracotta` or `granite` / `bricks`
  - `calcite` (`1.17+`) -> `diorite` / `quartz_block` / `white_terracotta`
  - `copper_block` (`1.17+`) -> `cut_red_sandstone` / `prismarine_bricks` (oxidized)

## Verification
- 100% of palette block IDs resolve to non-null entries in `minecraft-data(version).blocksByName`.
- All decorative leaves carry `persistent=true` or adjacent log support.
- Zero unsupported gravity blocks exist in palette assignments above `dy = 0`.

## Fallback Strategies
- Survival scarcity fallback: if rare materials (`quartz_block`, `prismarine`, `dark_oak`) are unavailable in survival inventory and cheats are disabled, map palette cleanly to locally abundant biome materials (`cobblestone`, `stone_bricks`, `oak_log`, `oak_planks`, `spruce_planks`, `glass_pane`).
