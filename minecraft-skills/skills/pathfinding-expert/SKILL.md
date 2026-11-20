# Skill: Pathfinding Expert (`pathfinding-expert`)

## Role
Autonomous 3D navigation, reach-positioning, obstacle avoidance, and scaffolding mobility controller enabling the embodied Mineflayer bot to move safely around complex construction sites without getting trapped inside walls, falling off roofs, or damaging finished builds.

## Capabilities
- Configure and execute `mineflayer-pathfinder` A* routes using `GoalNear(x, y, z, range)`, `GoalBlock(x, y, z)`, `GoalXZ(x, z)`, and `GoalY(y)`.
- Enforce **non-destructive site navigation** (`movements.canDig = false` during late construction stages so the pathfinder never mines through freshly built walls to take a shortcut!).
- Calculate **optimal standoff placement positions** (`2.0 <= dist <= 4.2` blocks from target voxel, clear line-of-sight, outside the target block's `1x2x1` player AABB hitbox).
- Recover stuck bots via jump-unstuck, creative flight (`fly-to`), or safe perimeter teleportation when opped.

## Tools
- **Primary (`nightforge-mcp`):** `nf_navigate`, `nf_status`, `nf_inspect_region`
- **Complementary (`yuniko-minecraft-mcp`):** `move-to-position`, `fly-to`, `look-at`, `jump`, `move-in-direction`, `get-position`

## Workflow
1. Read current bot position `(Bx, By, Bz)` via `nf_status` or `get-position`.
2. Before placing a block by hand at `(Tx, Ty, Tz)`:
   - Check Euclidean distance `d = hypot(Bx - Tx, By + 1.62 - Ty, Bz - Tz)` (from bot eye height!).
   - Check AABB intersection: ensure `[Tx, Ty, Tz]` does NOT overlap `[floor(Bx - 0.3)..floor(Bx + 0.3), floor(By)..floor(By + 1.8), floor(Bz - 0.3)..floor(Bz + 0.3)]`.
3. If `d > 4.2` or AABB overlaps:
   - Select a safe solid standing block `(Sx, Sy, Sz)` at distance `2.5–3.8` blocks outside the wall plane.
   - Call `nf_navigate` (`x: Sx, y: Sy, z: Sz, range: 1, canDig: false`).
4. Call `look-at` toward the reference block face center before invoking `place-block`.

## Decision Rules
- **Construction Stage Digging Lock:**
  - During `world-surveyor` exploration in wilderness: `canDig: false`, `allowParkour: true`.
  - During `03`–`09` construction stages: `canDig: false`, `allow1by1towers: false` (unless explicitly scaffolding in survival) — NEVER allow `mineflayer-pathfinder` to break blueprint blocks!
- **Creative Flight vs. Ground A*:**
  - When `gameMode === 'creative'` and working on roofs (`dy >= 6`), use `fly-to` (`yuniko-minecraft-mcp`) or elevated vantage hover `3` blocks outside the roof eave for unobstructed overview and placement.
  - When `gameMode === 'survival'`, navigate via interior staircase or exterior temporary dirt/scaffolding ladder along `[X0 - 2, Z0 - 2]`.

## Safety Rules
- Never pathfind across open lava, fire, cactus, sweet berry bushes, or `> 3`-block unguarded drops in survival mode (`maxDropDown = 3`).
- Always move the bot OUTSIDE the blueprint bounding box (`[X0 - 3, Y0, Z0 + D + 3]`) before initiating bulk `nf_bulk_edit` or `nf_build_blueprint` operations!

## Failure Handling
- **`NoPath` or `Timeout` from `mineflayer-pathfinder`:**
  1. Inspect immediate `3x3x3` neighborhood around bot (`nf_inspect_region`) to check if bot was accidentally walled in or stuck in an open door/fence hitbox.
  2. Toggle adjacent door if closed, or step `1` block laterally (`move-in-direction`), or if opped/creative use safe standoff reposition outside the bounding box.
- **Temporary Scaffolding Cleanup:** Record every temporary survival scaffold coordinate placed in `progress-ledger.json` (`tempScaffolding[]`) and break all of them top-down before `build-verifier` runs!

## Verification
- Bot arrives within requested `range` of goal `(Gx, Gy, Gz)` as confirmed by `nf_status` / `get-position`.
- Zero blueprint blocks damaged during transit.

## Fallback Strategies
- On JVM Fabric/Forge clients running survival mega-builds over `> 100`-block distances, hand off long-range chunk traversal to **Baritone** (`#goto X Y Z` with `#allowBreak false` inside build zone).
