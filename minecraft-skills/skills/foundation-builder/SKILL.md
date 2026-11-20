# Skill: Foundation Builder (`foundation-builder`)

## Role
Substructure and ground-floor slab specialist responsible for anchoring the building into the terrain with zero floating corners, building weathered stone plinths, laying ground-floor flooring, and constructing accessible entrance thresholds/porch steps.

## Capabilities
- Sink corner and bay **sub-grade footings** downward (`y = Y0 - 1, Y0 - 2, ...`) until every column hits solid native ground.
- Construct raised **masonry plinths** (`stone_bricks`, `mossy_stone_bricks`, `cracked_stone_bricks`, `cobblestone`, `polished_andesite`) at `dy = 0`.
- Lay contrast-framed **ground-floor interior decks** (`spruce_planks` / `oak_planks` bordered by stripped log beams).
- Build **entrance stairs and porch landings** (`stone_brick_stairs[facing=...]`) connecting exterior ground `Y0 - 1` smoothly to interior floor `Y0 + 1` (or flush threshold at `Y0`).

## Tools
- **Primary (`nightforge-mcp`):** `nf_build_blueprint` (`section: "02_foundation"`), `nf_bulk_edit`, `nf_place_block`, `nf_inspect_region`
- **Complementary (`yuniko-minecraft-mcp`):** `place-block`, `get-block-info`

## Workflow
1. Inspect `[X0, Y0 - 1, Z0] .. [X0 + W - 1, Y0 - 1, Z0 + D - 1]` via `nf_inspect_region` to confirm `terrain-engineer` left zero unsupported air pockets beneath the footprint.
2. If any perimeter column `(x, Y0 - 1, z)` sits over air/water/grass, extend a `stone_bricks`/`cobblestone` pier downward until hitting solid ground.
3. Construct the outer masonry plinth ring at `y = Y0` (`dx = 0` or `W-1`, `dz = 0` or `D-1`) using the weathered masonry ratio (`75% stone_bricks`, `15% mossy_stone_bricks`, `10% cracked_stone_bricks`).
4. Fill the interior ground-floor slab at `y = Y0` (`dx in [1..W-2], dz in [1..D-2]`) with interior flooring material (`spruce_planks` / `oak_planks`), placing hearth fireproof stone (`stone_bricks` / `cobblestone`) beneath any planned fireplace/chimney!
5. Construct exterior porch steps (`stone_brick_stairs` facing into the doorway) so players and bots walk up without needing to jump if desired, or step cleanly `1` block onto the porch landing.
6. Update `progress-ledger.json` marking `02_foundation` verified.

## Decision Rules
- **Zero-Float Law:** Every single perimeter coordinate `(x, Y0, z)` MUST have a non-air solid block at `(x, Y0 - 1, z)`. Floating building corners are an automatic verification failure.
- **Raised Plinth vs. Flush Slab:**
  - Timber/medieval/Nordic halls: raise interior floor to `y = Y0` (1 block above exterior `Y0 - 1` grass) with exterior stone steps up to the front door at `y = Y0 + 1`.
  - Workshops/barns/garages: flush threshold at ground level with buried perimeter stone footing at `y = Y0 - 1`.
- **Bulk vs. Weathered Placement:** Place solid interior floor deck via single `nf_bulk_edit` `fill`, then place weathered perimeter masonry plinth via blueprint coordinates so mossy/cracked accents land deterministically.

## Safety Rules
- Never leave hollow unlit dark cavities (`light < 8`, height `>= 2`) under raised foundations crawlspaces where creepers/zombies can spawn; either fill solid, slab the bottom, or light with hidden `torch`/`glowstone`.
- Move bot outside the slab volume (`nf_navigate` to `Z0 + D + 2`) before executing bulk foundation fills so the bot is not suffocated inside stone!

## Failure Handling
- **Bot Standing Inside Target Block (`placeBlock` blocked by entity hitbox):** Call `nf_navigate` to step `2` blocks away from target coordinate, then retry `nf_place_block`.
- **Stair Step Facing Backwards (`facing` inverted):** Re-place explicitly with `stone_brick_stairs[facing=<inward_cardinal>,half=bottom]`.

## Verification
- `nf_inspect_region` confirms `100%` solid non-air coverage across `[X0, Y0, Z0] .. [X0 + W - 1, Y0, Z0 + D - 1]`.
- `0` air/water blocks exist at `y = Y0 - 1` directly beneath the foundation perimeter.
- Entrance steps orient smoothly toward the doorway with `>= 2` blocks width.

## Fallback Strategies
- If `mossy_stone_bricks` or `cracked_stone_bricks` are unavailable in survival inventory, substitute `cobblestone` and `andesite` into the `stone_bricks` plinth mix.
