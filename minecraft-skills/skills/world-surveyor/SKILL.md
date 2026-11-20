# Skill: World Surveyor (`world-surveyor`)

## Role
Autonomous reconnaissance and site-selection specialist responsible for inspecting live Minecraft chunks, computing terrain elevation heightmaps, identifying surface materials and hazards, detecting existing player structures, and selecting safe, optimal build coordinates `(X0, Y0, Z0)` before any blueprint is placed.

## Capabilities
- Query live bot telemetry (exact coordinates, yaw/pitch, dimension, gamemode, loaded chunk radius).
- Generate 2D surface heightmaps `Y_top(x, z)` across arbitrary survey radii (`8` to `64` blocks).
- Compute terrain flatness metrics (elevation min/max, median `Y_grade`, standard deviation `sigma_Y`, maximum slope `|dY/dx|` and `|dY/dz|`).
- Classify surface composition (grass, stone, sand, water, lava, snow, foliage/trees, artificial player blocks).
- Score candidate rectangular build footprints `(W + 2*margin) x (D + 2*margin)` to minimize earthwork volume and avoid hazards.
- Capture pre-construction baseline screenshots (`nf_render_view`) of the chosen pad.

## Tools
- **Primary (`nightforge-mcp`):** `nf_status`, `nf_survey_site`, `nf_inspect_region`, `nf_entities`, `nf_render_view`
- **Complementary (`yuniko-minecraft-mcp`):** `get-position`, `get-block-info`, `find-blocks`, `find-entity`, `detect-gamemode`

## Workflow
1. Call `nf_status` (or `get-position` + `detect-gamemode`) to confirm live server connection, dimension, and bot spawn coordinates `(Bx, By, Bz)`.
2. Determine required build footprint `(W, D)` plus landscaping clearance margin `M` (default `M = 4` blocks on all four sides).
3. Invoke `nf_survey_site` centered near `(Bx + 8, Bz + 8)` with `radius >= max(W, D) + 8` to scan loaded chunks.
4. Evaluate candidate origin pads of size `(W + 2M) x (D + 2M)`:
   - Reject any pad containing protected player containers/structures or lava.
   - Compute earthwork cost `C = sum(|Y_top(x,z) - median_Y|)` + `5 * water_columns`.
   - Select the minimum-cost candidate pad and set `Y0 = median_Y + 1` (surface build plane) with foundation anchoring at `Y0 - 1`.
5. Call `nf_entities` across the selected footprint to check for players, villagers, pets, or item drops.
6. Call `nf_render_view` (`source: "world"`, `mode: "isometric"`) to save the pre-build baseline image (`renders/live_world_before_build.png`).
7. Record `origin`, `boundingBox`, `medianElevation`, and `surveySummary` into `progress-ledger.json`.

## Decision Rules
- **Flat Site (`sigma_Y <= 0.5` and `max_delta_Y <= 1`):** Skip heavy cut-and-fill; proceed directly to `foundation-builder` after clearing surface grass/flowers.
- **Moderate Slope (`1 < max_delta_Y <= 4`):** Route to `terrain-engineer` for balanced cut-and-fill grading (`Y_pad = round(median_Y)`) plus stepped plinth foundation.
- **Steep Cliff / Hillside (`max_delta_Y > 4`):** Do NOT bulldoze an unnatural sheer cliff wall; either relocate within survey radius OR route to `foundation-builder` for stilted stone-brick piers/retaining terrace.
- **Water Coverage (`> 10%` of footprint):** Relocate inland unless building an intentional dock, bridge, or boathouse.
- **Solar / Approach Orientation:** Orient primary entrance toward the clearest flat approach corridor facing the spawn/road vector.

## Safety Rules
- **Read-Only Mandate:** `world-surveyor` NEVER places, breaks, or modifies any block in the world.
- **Player Build Protection:** Flag any artificial block (`planks`, `stone_bricks`, `cobblestone`, `glass`, `chest`, `barrel`, `furnace`, `crafting_table`, `bed`, `door`, `torches`, `signs`, `wool`, `concrete`) as a non-natural structure and enforce a minimum `8`-block buffer around existing builds.
- **Chunk Load Boundary Check:** Never trust `air` readings in unloaded chunks (`bot.blockAt(pos) === null`); move closer (`nf_navigate`) until chunks stream in before finalizing survey data.

## Failure Handling
- **Null / Unloaded Chunks Returned:** Navigate bot incrementally toward survey center (`nf_navigate` within `16` blocks) and pause `500 ms` for chunk packets before re-running `nf_survey_site`.
- **No Valid Pad in Current Radius:** Expand search via cardinal offsets (`+32 X`, `-32 X`, `+32 Z`, `-32 Z`), navigating bot to load adjacent chunks and re-scoring.
- **Bot Trapped Underground or In Cave at Spawn:** Inspect vertical column `(Bx, y, Bz)` up to `y = 255` to locate sky-exposed surface `Y_surface` rather than using subterranean `By`.

## Verification
- Chosen `origin` `(X0, Y0, Z0)` has `0` unloaded columns across `[X0 - M, X0 + W + M] x [Z0 - M, Z0 + D + M]`.
- Protected artificial block count inside footprint equals `0`.
- Vertical headroom `[Y0, Y0 + H + 4]` is within world height limits (`Y < worldHeight - 2`).
- Baseline world render PNG exists on disk and is non-empty.

## Fallback Strategies
- If `nf_survey_site` times out on an oversized radius, subdivide into `16x16` chunk-aligned `nf_inspect_region` calls.
- If only `yuniko-minecraft-mcp` is connected, sample a `3`-block stride grid with `get-block-info` + `find-blocks` for `chest`/`oak_planks`/`water`/`lava` to reconstruct a coarse heightmap.
