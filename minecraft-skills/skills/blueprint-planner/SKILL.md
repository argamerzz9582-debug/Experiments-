# Skill: Blueprint Planner (`blueprint-planner`)

## Role
Deterministic construction compiler that converts architectural designs into exact 3D coordinate maps, ASCII/JSON floor plans and elevations, Sponge `.schem` v2 NBT files, Material Bills of Materials (BOM), and topologically ordered execution stages.

## Capabilities
- Compile semantic architectural definitions into dense/sparse 3D voxel grids `V[dx][dy][dz]` with canonical Minecraft blockstate strings (`namespace:block[prop=val]`).
- Generate human- and agent-readable **Floor Plans** (ground floor, upper floor, roof plan), **Front Elevation**, and **Side Elevation** diagrams (`blueprints/*_plans.md`).
- Compute exact **Material Quantity Estimates (BOM)** grouped by block type, exact item count, and 64-stack survival requirements.
- Partition voxels into **independently verifiable construction sections**:
  1. `01_site_pad`
  2. `02_foundation`
  3. `03_structural_frame`
  4. `04_exterior_walls`
  5. `05_floors_and_stairs`
  6. `06_roof_system`
  7. `07_windows_and_doors`
  8. `08_interior_fitout`
  9. `09_landscaping_and_lighting`
- Sort blocks within each section by **attachment dependency class** (`solid -> floor-standing -> multi-block -> wall/ceiling-attached`) and ascending `Y` coordinate.
- Export standard **Sponge Schematic v2 (`.schem`)** gzipped NBT files and verify lossless round-trip decoding.

## Tools
- **Primary (`nightforge-mcp`):** `nf_compile_blueprint`, `nf_render_view`
- **Core Modules:** `nightforge/src/core/blueprint-compiler.js`, `nightforge/src/core/schematic-io.js`

## Workflow
1. Receive architectural parameters, block palette, and world origin `(X0, Y0, Z0)` from `architect` and `world-surveyor`.
2. Run `nf_compile_blueprint` to populate the local coordinate grid `(dx, dy, dz)` and project to world coordinates `(X0 + dx, Y0 + dy, Z0 + dz)` (accounting for any cardinal rotation).
3. Run static blueprint lint checks:
   - Validate all block names and property keys/values against `minecraft-data` for the active server version (`1.16.5` – `1.21.x`).
   - Verify two-block doors (`oak_door`, `spruce_door`) have paired `[half=lower]` at `dy` and `[half=upper]` at `dy + 1` with matching `facing` and `hinge`.
   - Verify hanging blocks (`lantern[hanging=true]`) have solid underside support at `dy + 1` and standing blocks (`torch`, `lantern[hanging=false]`, `flower_pot`, `door`) have solid top support at `dy - 1`.
4. Emit `blueprints/<name>_blueprint.json`, `blueprints/<name>.schem`, and `blueprints/<name>_plans.md`.
5. Run schematic round-trip check: decode `.schem` back into a voxel grid and assert `0` blockstate mismatches.
6. Render `renders/blueprint_preview_sheet.png` via `nf_render_view`.

## Decision Rules
- **Greedy Cuboid Compression for Bulk Stages:** Group contiguous identical solid blocks in `02_foundation` and `04_exterior_walls` into maximal axis-aligned cuboids `[x1,y1,z1]..[x2,y2,z2]` so `worldedit-engineer` can place `50–200` blocks in a single command.
- **Individual Placement for Stateful Blocks:** Never merge directional blocks (`stairs`, `logs` with `axis`, `doors`, `trapdoors`, `torches`, `chests`, `furnaces`) across mismatched orientations.
- **Air Clearing Policy:** Include explicit interior `air` carving volumes inside blueprint envelopes so terrain protrusions are cleared cleanly before interior furnishing.

## Safety Rules
- Never emit unknown block IDs or version-incompatible blocks without passing through `block-palette-expert` version validation (`mcData.blocksByName[name]` must exist!).
- Persist blueprint checksum and bounding box to `progress-ledger.json` before starting `nf_build_blueprint` so verification compares against an immutable target spec.

## Failure Handling
- **Invalid Blockstate Property Detected at Compile Time:** Auto-normalize property against `minecraft-data` valid state definitions (e.g., stripping unsupported `waterlogged` on non-waterloggable blocks) or substitute via `block-palette-expert` fallback table.
- **Floating Attachment Detected in Static Lint:** Either insert a structural bracket (`fence`, `wall`, `slab`, `trapdoor`) at the missing support coordinate or reclassify attachment (`lantern[hanging=false]` -> `[hanging=true]` if ceiling exists).

## Verification
- `0` invalid block names or invalid blockstate combinations against target server `minecraft-data`.
- `.schem` export file exists, parses cleanly via `prismarine-nbt`, and matches source voxel count 100%.
- Sum of section block counts equals total blueprint non-air voxel count.
- Floor plans, front elevation, side elevation, roof plan, and BOM written to `blueprints/<name>_plans.md`.

## Fallback Strategies
- If `.schem` binary consumers are unavailable on the target server, execute directly from `blueprints/<name>_blueprint.json` staged instruction list via `nf_build_blueprint`.
