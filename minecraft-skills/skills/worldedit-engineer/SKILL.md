# Skill: WorldEdit Engineer (`worldedit-engineer`)

## Role
High-throughput bulk voxel manipulation specialist responsible for accelerating site grading, foundations, large wall shells, floor decks, and `.schem` operations using WorldEdit/FAWE (`//pos1`, `//pos2`, `//set`, `//walls`, `//replace`, `//undo`) or vanilla `/fill` batching with strict volume caps and pre-mutation safety snapshots.

## Capabilities
- Probe server capability tier (`worldedit` vs `vanilla_op_fill` vs `bot_hand_only`) safely at session initialization.
- Decompose sparse architectural masks into minimal axis-aligned cuboids (**Greedy Box Meshing**) to slash command count by `10x–50x`.
- Execute WorldEdit region selections (`//pos1 x1,y1,z1`, `//pos2 x2,y2,z2`) and pattern mutations (`//set 75%stone_bricks,15%mossy_stone_bricks,10%cracked_stone_bricks`, `//walls`, `//replace`).
- Partition mega-volumes (`> 32,768` blocks) into chunk-friendly sub-boxes (`16x16x16`) with rate-limited dispatch (`<= 25` commands/sec) so server TPS never drops and anti-spam never kicks the bot.
- Automatically capture reversible region snapshots (`snapshots/*.json`) prior to every bulk mutation.

## Tools
- **Primary (`nightforge-mcp`):** `nf_bulk_edit`, `nf_rollback`, `nf_inspect_region`, `nf_status`
- **Complementary (`yuniko-minecraft-mcp`):** `send-chat`, `read-chat`

## Workflow
1. Check `nf_status` for `capabilities.worldEdit` and `capabilities.opCommands`.
2. Validate target bounding box `[x1, y1, z1] .. [x2, y2, z2]`:
   - Confirm volume `V = (|x2-x1|+1)*(|y2-y1|+1)*(|z2-z1|+1) <= 65,536`.
   - Confirm zero protected external player containers exist in `[x1..x2, y1..y2, z1..z2]`.
   - Confirm bot position is outside solid fill volume (`pathfinding-expert`).
3. Invoke `nf_bulk_edit` (`operation: "fill" | "walls" | "replace" | "clear"`):
   - Engine automatically snapshots existing blockstates in the region to `snapshots/snap_<timestamp>.json` and registers `snapshotId` in `progress-ledger.json`.
   - Dispatches WorldEdit (`//pos1`, `//pos2`, `//set` / `//walls` / `//replace`) or `/fill` sub-cuboids.
4. Wait for chunk update confirmation (`150–300 ms`), then sample corner and center coordinates via `nf_inspect_region` to confirm mutation actually took effect in the live world!

## Decision Rules
- **Minimum Bulk Threshold:** Only invoke `worldedit-engineer` when contiguous cuboid volume `V >= 8` blocks; for `1–7` blocks or intricate multi-orientation trim, use `nf_place_block` directly.
- **Weighted Pattern Syntax:**
  - When WorldEdit/FAWE is active: use native `//set 75%stone_bricks,15%mossy_stone_bricks,10%cracked_stone_bricks`.
  - When only vanilla `/fill` is active: base-fill `stone_bricks` via `/fill`, then apply deterministic accent coordinates via `/setblock` so weathering is never lost!
- **Paste Air Handling:** When pasting schematics via WorldEdit, ALWAYS use `//paste -a` (skip air) around irregular terrain exteriors unless intentionally carving an underground interior room!

## Safety Rules
- **NEVER issue `//regen`, `//cyl`, `//sphere`, or `//set` without explicit coordinate arguments (`//pos1 x,y,z` + `//pos2 x,y,z`)** — relying on stale wand selections can wipe out an entire spawn city!
- **Hard Volume Ceiling:** Reject any single unpartitioned request `> 65,536` blocks without explicit multi-chunk staging.
- **No Blind Retry:** If a bulk command fails or partially applies, inspect the live region first before re-issuing!

## Failure Handling
- **`Unknown command` on `//pos1`:** Downgrade session `capabilities.worldEdit = false` automatically and switch seamlessly to vanilla `/fill` + `/setblock` without aborting the build.
- **`Too many blocks in the specified area` on vanilla `/fill` (`> 32,768`):** Subdivide box along longest axis into `16x16x16` (`4,096`-block) chunks and execute sequentially.
- **Accidental Overfill / Wrong Coordinates:** Immediately invoke `nf_rollback` with the captured `snapshotId` (or `//undo` on WorldEdit) and verify restoration via `nf_inspect_region`.

## Verification
- Corner, midpoint, and boundary sample reads via `nf_inspect_region` match target blockstate 100%.
- Undo `snapshotId` is recorded and non-empty on disk.

## Fallback Strategies
- If neither WorldEdit nor `/fill` operator permissions exist on a strict survival server, compile greedy cuboids into a serpentine layer-by-layer pathfinding queue executed by `structural-builder` + `pathfinding-expert`.
