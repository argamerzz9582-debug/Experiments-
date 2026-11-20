# Skill: Landscaping (`landscaping`)

## Role
Exterior site architect responsible for integrating the finished structure organically into the surrounding world with walkable pathways, entrance courtyards, perimeter lanterns, planter boxes, hedges, custom flora, and natural ground texturing.

## Capabilities
- Lay textured **approach pathways** (`stone_bricks`, `cobblestone`, `andesite`, `gravel` / `coarse_dirt` / `grass_path`) connecting exterior roads/clearings directly to the front porch steps.
- Build **window planter boxes** (`grass_block` / `dirt` wrapped with `spruce_trapdoor[open=true,facing=...]` topped with flowers `poppy`, `cornflower`, `fern`).
- Construct **perimeter hedges & low garden walls** (`cobblestone_wall`, `stone_brick_wall`, `oak_leaves[persistent=true]`).
- Install **exterior lamp posts** (`cobblestone_wall` + `spruce_fence` post + `lantern`) lighting the entrance path and building corners to prevent mobs ambushing the doorway.

## Tools
- **Primary (`nightforge-mcp`):** `nf_build_blueprint` (`section: "09_landscaping_and_lighting"`), `nf_place_block`, `nf_inspect_region`, `nf_render_view`

## Workflow
1. Confirm exterior building shell, roof, windows, and doors (`02`–`07`) are complete so no overhead scaffolding or falling blocks crush garden plantings.
2. Construct the main **entrance walkway** (`3` blocks wide) extending outward `3–5` blocks from the front steps at ground level (`y = Y0 - 1` or `Y0`), textured with weathered stone (`stone_bricks`, `mossy_stone_bricks`, `cobblestone`, `andesite`).
3. Flank the entrance path with symmetrical **lantern posts** (`stone_brick_wall` base + `spruce_fence` shaft + `lantern`) for welcoming warm framing and spawn protection.
4. Place **hedges and floral accents** (`oak_leaves[persistent=true]`, `potted_fern` / `poppy` / `dandelion` on grass) along the side plinths to soften the masonry-to-grass transition.
5. Inspect exterior perimeter walkability (`nf_verify_structure`) to ensure hedges/walls never block the main entrance approach!

## Decision Rules
- **Persistent Foliage Rule:** Every placed leaf block MUST specify `[persistent=true]` (or touch an embedded `oak_log`/`spruce_log` root block) so leaves never decay over time.
- **Scale Proportionality:** Keep hedges `1–2` blocks tall so they frame the stone plinth without hiding ground-floor windows!
- **Path Contrast:** Contrast pathway materials against native biome turf (`cobblestone`/`stone_bricks`/`andesite` against green `grass_block`).

## Safety Rules
- Never plant `bamboo` or `vines` unchecked on timber walls without string stops, as random tick growth will swallow windows and facades.
- Never dig decorative ponds deeper than `1` block near doorways without fence/lilypad safety, and never flood redstone/torches.

## Failure Handling
- **Flower Rejection on Non-Dirt/Grass Block:** Verify `(x, y - 1, z)` is `grass_block`, `dirt`, or `coarse_dirt` before placing `poppy`/`dandelion`/`fern`, or use `flower_pot` on solid blocks.
- **Trapdoor Planter Opens Flat Instead of Vertical:** Explicitly set `[facing=<outward>,open=true,half=bottom]` so trapdoors fold flat vertically against the dirt block!

## Verification
- Unobstructed `>= 2`-block-wide walkable path from exterior perimeter `(X0 + midX, Y0, Z0 + D + 2)` up to and through the main entrance door.
- Exterior entrance zone illuminated by at least `2` light sources (`lantern` / `torch`).
- Zero decaying leaves (`persistent=false` without log) in placed landscaping.

## Fallback Strategies
- If specific flower IDs vary across Minecraft versions (`short_grass` in `1.20.3+` vs `grass` in `1.16.5`), check `minecraft-data` block registry and substitute `poppy`, `dandelion`, or `oak_leaves[persistent=true]`.
