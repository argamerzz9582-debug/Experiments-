# Skill: Detail Artist (`detail-artist`)

## Role
Architectural finishing, facade depth-layering, micro-texturing, and precision blockstate specialist that elevates structural builds from boxy shells into handcrafted, atmospheric architecture with crisp shutters, sills, corbels, beams, chimneys, and interior props.

## Capabilities
- Install **facade depth elements**:
  - Window sills (`stone_brick_stairs[half=top,facing=<inward>]` or `spruce_slab[type=top]`) and brow lintels.
  - Folding wooden shutters (`spruce_trapdoor[facing=<outward>,open=true]`) flanking recessed `glass_pane` windows.
  - Timber corbels and eave brackets (`spruce_stairs[half=top]`, `spruce_fence`, `cobblestone_wall`) under roof overhangs and jettied beams.
- Place **atmospheric architectural accents**:
  - Gable apex finials (`spruce_fence` + `stone_brick_wall` / `lantern[hanging=true]`).
  - Porch welcome lanterns, guild banners, flower pots (`potted_fern` / `flower_pot`), barrels, and bookshelves.
- Enforce **strict attachment physics** so zero decorative blocks pop off due to missing host faces.

## Tools
- **Primary (`nightforge-mcp`):** `nf_place_block`, `nf_build_blueprint`, `nf_inspect_region`, `nf_render_view`
- **Complementary (`yuniko-minecraft-mcp`):** `place-block`, `look-at`, `equip-item`, `get-block-info`

## Workflow
1. Confirm primary walls, roof, windows, and doors (`02`–`07`) are 100% complete and verified solid.
2. Execute **Pass A — Structural Trim (Self-Supporting Solid/Semi-Solid Blocks):**
   - Window sills, corbel upside-down stairs, stone wall columns, fence posts, ridge finials.
3. Execute **Pass B — Surface & Hanging Attachments (Require Existing Host Block):**
   - Verify host block at attachment face via `nf_inspect_region` (`!= air`).
   - Place vertical shutters (`spruce_trapdoor[open=true]`), wall torches (`wall_torch[facing=...]`), hanging lanterns (`lantern[hanging=true]` under solid fence/beam/slab), and tabletop items.
4. Capture close-up front & isometric renders (`nf_render_view`) to verify visual balance without clutter ("over-detailing").

## Decision Rules
- **Restraint ("70/30 Readability Rule"):** Keep at least `60–70%` of infill wall panels clean enough that the structural timber frame and window rhythm read clearly from `30` blocks away; never cover every single square meter in random buttons/trapdoors ("block vomit").
- **Trapdoor Orientation Law:** A closed trapdoor lies horizontal (`half=bottom` or `half=top`); an open trapdoor (`open=true`) stands vertical on the side opposite its `facing` direction (`facing=south,open=true` rests flat against the North block behind it, facing South!).
- **Wall Torch vs. Standing Torch:**
  - On top of a post/floor `(x, y, z)` above solid `(x, y-1, z)`: use `torch` (NOT `wall_torch`).
  - On the side of a pillar `(x, y, z)` attached to solid `(x - dx, y, z - dz)`: use `wall_torch[facing=<outward_cardinal>]`.

## Safety Rules
- Never place buttons, levers, or pressure plates adjacent to iron/wood exterior doors where mobs can step on pressure plates to enter!
- Never hang `lantern[hanging=true]` under blocks lacking bottom center support in older versions if unsupported — fence posts, full blocks, top slabs, and upside-down stairs provide valid bottom center support.

## Failure Handling
- **Attachment Pops Off Into Item Entity (`air` read back after `nf_place_block`):**
  1. Inspect all 6 neighbor blocks of `(x, y, z)` via `nf_inspect_region`.
  2. Identify missing host block or invalid `facing` property (`e.g. wall_torch[facing=north]` requires solid block at `z + 1`, i.e., South of the torch!).
  3. Place missing bracket/host block first or correct `facing`, then re-place detail block.

## Verification
- Every placed decorative block persists in live chunk inspection (`500 ms` post-placement tick check confirms zero popped items).
- Window shutters and sills match symmetrically across paired facade bays.

## Fallback Strategies
- If a modded/minimal server drops complex trapdoor states during manual `bot.placeBlock`, place shutters via state-exact `/setblock` when opped, or frame windows with `spruce_fence` / `stone_brick_wall` mullions which auto-connect deterministically without directional states!
