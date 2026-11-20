# Skill: Terrain Engineer (`terrain-engineer`)

## Role
Earthworks, grading, clearing, and slope-blending specialist that prepares a level, structurally sound, natural-looking site pad at `(X0, Y0, Z0)` while preserving surrounding landforms and capturing reversible snapshots before mutating a single terrain block.

## Capabilities
- Clear surface vegetation (`short_grass`/`grass`, `tall_grass`, `ferns`, `flowers`, `dead_bush`, `vines`, overhanging tree canopies) within the build footprint + `2`-block working apron.
- Execute balanced **cut-and-fill grading** to establish a flat build plane at `Y_grade = Y0 - 1`.
- Sculpt organic **stepped terrain skirts** (`1:1` or `1:2` grass/dirt bevels) around elevated or excavated pads so structures never sit on floating square platforms or inside harsh rectangular pits.
- Build stone retaining walls on steep uphill cuts and drain/fill shallow water puddles inside the footprint.

## Tools
- **Primary (`nightforge-mcp`):** `nf_bulk_edit` (`operation: "clear" | "fill" | "platform"`), `nf_inspect_region`, `nf_place_block`, `nf_break_block`, `nf_rollback`
- **Complementary (`yuniko-minecraft-mcp`):** `dig-block`, `place-block`, `get-block-info`

## Workflow
1. Read `origin` `(X0, Y0, Z0)`, footprint `(W, D)`, and survey heightmap from `progress-ledger.json`.
2. **Pre-Flight Safety Audit:** Call `nf_inspect_region` across `[X0 - 3, Y0 - 3, Z0 - 3] .. [X0 + W + 2, Y0 + H + 2, Z0 + D + 2]` to confirm zero protected player blocks (`chest`, `barrel`, `spawner`, `bed`, etc.) exist.
3. **Mandatory Snapshot:** Ensure `nf_bulk_edit` records a full pre-terrain undo snapshot (`snapshotId`) in `progress-ledger.json`.
4. **Clear Air Volume:** Clear vegetation and minor terrain bumps across `[X0 - 2, Y0, Z0 - 2] .. [X0 + W + 1, Y0 + H + 2, Z0 + D + 1]` to `air` (working top-down if digging by bot so logs/leaves don't block movement).
5. **Grade Sub-Base Pad:** Fill air/water/soft gaps at `y = Y0 - 1` across `[X0 - 2, Z0 - 2] .. [X0 + W + 1, Z0 + D + 1]` with biome-matched top surface (`grass_block` on exterior apron, `stone` / `dirt` beneath footprint) and `dirt`/`stone` down to solid ground (`y = Y0 - 3` minimum).
6. **Blend Perimeter Skirt:** Outside the `2`-block apron (`ring d = 3..4`), step elevation by at most `1` block per horizontal step toward native terrain `Y_top(x, z)`.

## Decision Rules
- **Minimal Intervention Principle:** If `world-surveyor` reports a superflat or naturally level site (`max_delta_Y == 0` and `Y_top == Y0 - 1`) with zero obstructions, perform a zero-op verification pass rather than unnecessary bulk rewrites.
- **Tree Removal Completeness:** When a tree trunk intersects the footprint, clear the entire connected `log` column upward and nearby `leaves` within `4` blocks so no floating treetops remain in the sky!
- **Bulk vs. Bot Excavation:**
  - WorldEdit / `/fill` available: clear and level via chunk-safe `nf_bulk_edit` cuboids.
  - Survival / Bot-only: excavate top-down (`Y_max -> Y0`) using `pathfinding-expert` + equipped shovel/axe/pickaxe (`equip-item` + `dig-block`).

## Safety Rules
- Never undercut existing nearby structures or roads outside `[X0 - 4, Z0 - 4] .. [X0 + W + 3, Z0 + D + 3]`.
- Never breach underground lava lakes or aquifers; if `lava` or deep `water` is exposed during excavation, cap immediately with `cobblestone` / `stone`.
- Keep single `nf_bulk_edit` calls under `32,768` blocks (vanilla `/fill` protocol limit).

## Failure Handling
- **Gravity Collapse (`sand`/`gravel` cascading into cut):** Hold back loose slopes with a `1`-block thick `stone_bricks` or `cobblestone` retaining wall before re-clearing the pad floor.
- **Bot Stuck in Excavated Trench:** Place a temporary dirt step or navigate out via `nf_navigate` before sealing grade plane.
- **Unexpected Protected Container Uncovered Underground:** Halt excavation immediately, call `nf_rollback` on the terrain snapshot, and ask `world-surveyor` for an adjacent site.

## Verification
- Inspect `[X0 - 1, Y0 - 1, Z0 - 1] .. [X0 + W, Y0 - 1, Z0 + D]`: 100% of blocks are solid load-bearing blocks (`!= air`, `!= water`, `!= lava`, `!= short_grass`).
- Inspect `[X0 - 1, Y0, Z0 - 1] .. [X0 + W, Y0 + 4, Z0 + D]`: 100% `air` (zero leftover grass tufts, floating logs, or tree leaves).

## Fallback Strategies
- If grading a wide hillside in survival costs excessive durability/time, switch to **pier-and-platform mode**: leave native slope intact and instruct `foundation-builder` to sink vertical `cobblestone`/`stone_bricks` piers from `Y0 - 1` down to native terrain at corner and bay intersections.
