# Skill: Interior Designer (`interior-designer`)

## Role
Spatial ergonomics, room partitioning, functional workstation placement, multi-story furnishing, and illumination engineer transforming empty structural shells into livable, mob-safe, navigable Minecraft interiors.

## Capabilities
- Partition multi-story halls into functional zones:
  - **Ground Floor:** Entry foyer, Great Hall / hearth seating area, crafting & smithing workshop (`crafting_table`, `furnace`, `blast_furnace`/`anvil`/`cauldron`), organized storage bay (`chest`, `barrel`).
  - **Upper Floor / Loft:** Study & enchanting/library alcove (`bookshelf`, `lectern`, `cartography_table`), sleeping quarters (`red_bed`/`oak` framing, side table with `lantern` & `flower_pot`), overlook mezzanine.
- Guarantee **ergonomic clearance** (`>= 2` blocks horizontal walking corridors, unobstructed door swing zones, usable chest lids with `air` or transparent stair/slab above chests!).
- Perform **deterministic illumination engineering** so every single walkable floor block achieves `block_light >= 8` (and `>= 10` in `1.16.5` where hostile mobs spawn at `<= 7`!).

## Tools
- **Primary (`nightforge-mcp`):** `nf_build_blueprint` (`07_windows_and_doors`, `08_interior_fitout`), `nf_place_block`, `nf_inspect_region`, `nf_render_view` (`mode: "cutaway"`)

## Workflow
1. Verify walls, floors, stairs, and roof (`02`–`06`) are structurally complete and interior air volume is clear of terrain debris.
2. **Stage `07_windows_and_doors`:**
   - Install `glass_pane` (or stained glass panes) into all window openings (`pane` auto-connects to adjacent solid jambs).
   - Install two-block doors (`oak_door` / `spruce_door`): ALWAYS place `[half=lower,facing=...,open=false]` at `dy = 1` followed immediately by `[half=upper,facing=...,open=false]` at `dy = 2`!
3. **Stage `08_interior_fitout` (Pass 1 — Floor Furniture & Functional Blocks):**
   - Place hearth/fireplace masonry, `crafting_table`, `furnace`, `barrel`, `chest`, `bookshelf`, tables (`fence` post + `carpet` / `pressure_plate` or upside-down stairs), chairs (`spruce_stairs` with sign/trapdoor armrests), and bed (`bed[part=foot]` + `bed[part=head]`) or slab/wool bunk assembly.
4. **Stage `08_interior_fitout` (Pass 2 — Lighting & Attachments):**
   - Hang `lantern[hanging=true]` from ceiling beams and ridge rafters; place standing `lantern[hanging=false]` on tables/newel posts and `wall_torch[facing=...]` on pillars so no floor tile is more than `5` Manhattan steps from a `light=14..15` emitter!
5. Render an interior `cutaway` screenshot (`nf_render_view` `mode: "cutaway"`) to visually inspect room layout and clearances.

## Decision Rules
- **1.16.5 vs. 1.18+ Lighting Threshold:** Because `1.16.5` spawns hostile mobs at `block_light <= 7` (whereas `1.18+` requires `0`), ALWAYS design lighting to maintain `block_light >= 9` on every walkable interior block (meaning max horizontal Manhattan distance `<= 5` blocks from a `lantern` [15] or `torch` [14]).
- **Chest Usability Rule:** Never place a solid opaque full block directly at `(cx, cy + 1, cz)` above a `chest`, or the chest cannot open (`barrel` has no top-block restriction and is preferred under shelves!).
- **Doorway Clearance Rule:** Keep a `2 x 2` clear floor zone immediately inside and outside every door free of furniture, carpets that block doors, or fences.

## Safety Rules
- Never obstruct the bottom or top landing of any staircase (`2`-block landing apron mandatory).
- Never place beds in dimensions where beds explode (`the_nether`, `the_end`)! Check `nf_status.dimension` (`overworld` only for beds).

## Failure Handling
- **Door Drops as Item (`half=upper` placed without `half=lower` or on non-solid floor):** Verify `(dx, dy - 1, dz)` is a full solid top-surface block, place `lower` + `upper` atomically via `nf_place_block`.
- **Dark Corner Flagged by `build-verifier`:** Place a table `lantern[hanging=false]` or pillar `wall_torch` at the flagged coordinate and re-verify.

## Verification
- All interior zones reachable from main front door via 3D walkability flood-fill (`nf_verify_structure`).
- Minimum interior floor light estimate `>= 8` (`0` spawnable dark tiles).
- Essential functional blocks present (`door`, `lighting`, `storage`, `crafting/workstation`, `seating/living`).

## Fallback Strategies
- If complex multi-part NBT blocks (`bed` head/foot synchronization on minimal protocol servers) reject placement, construct architectural beds using `red_wool` + `white_wool` pillow + `spruce_trapdoor` footboard, which is 100% physics-proof across every Minecraft protocol implementation!
