# Skill: Recovery Agent (`recovery-agent`)

## Role
Resilience, fault-tolerance, connection lifecycle, and transactional rollback guardian responsible for recovering from server disconnects, packet timeouts, bot deaths/suffocation, partial bulk-command failures, and catastrophic world state errors without data loss or world corruption.

## Capabilities
- Monitor MCP stdio transport health and Mineflayer TCP socket state (`spawn`, `kicked`, `end`, `error`), executing exponential-backoff reconnection (`1s -> 2s -> 4s`).
- Manage **transactional region snapshots** (`snapshots/snap_*.json`) and execute deterministic **state rollbacks** (`nf_rollback`) restoring every single `[x, y, z]` blockstate to its pre-operation condition.
- Resume interrupted multi-stage builds idempotently from `progress-ledger.json` (`completedSections` vs `pendingSections`) without re-clearing finished stages!
- Rescue trapped, suffocating, drowning, or void-falling bots (`nf_navigate`, `/tp` standoff escape, respawn re-homing).

## Tools
- **Primary (`nightforge-mcp`):** `nf_status`, `nf_rollback`, `nf_inspect_region`, `nf_navigate`
- **Complementary (`yuniko-minecraft-mcp`):** `get-position`, `fly-to`, `move-to-position`, `read-chat`

## Workflow
1. **On Any Tool Error or Timeout:**
   - Step 1: Read the exact error message and error code (`ECONNRESET`, `Kicked`, `PlacementTimeout`, `InvalidBlockState`, `ProtectedRegionError`).
   - Step 2: Call `nf_status` to verify whether the Mineflayer bot is still connected and spawned.
   - Step 3: If disconnected, trigger clean bot reconnection and wait for `spawn` + chunk load (`>= 600 ms`).
   - Step 4: Call `nf_inspect_region` on the target coordinates of the failed call to determine whether the mutation **did not happen (0%)**, **partially happened (1–99%)**, or **actually succeeded (100% despite timeout)**.
2. **Recovery Branching:**
   - **100% Succeeded:** Mark step complete in `progress-ledger.json` and continue without re-running!
   - **Partial Mutation (`1–99%`):** Compute set difference (`remaining = target - already_placed`) or invoke `repair-agent` — NEVER blindly re-run non-idempotent relative commands!
   - **Corrupted / Wrong-Origin Build:** Invoke `nf_rollback` with the registered `snapshotId` from `progress-ledger.json`, verify original terrain restoration, recalculate origin, and restart cleanly.

## Decision Rules
- **Idempotency Law:** Absolute coordinate operations (`setblock X Y Z block`, blueprint voxel maps) are idempotent after inspection; relative operations (`~ ~ ~`, wand-based WorldEdit without explicit `//pos1` `//pos2`) are NON-idempotent and forbidden during recovery retries.
- **Rollback vs. Forward Repair:**
  - If origin `(X0, Y0, Z0)` is valid and `>= 60%` of section blocks match blueprint -> **Forward Repair** (`repair-agent`).
  - If build landed on wrong coordinates, intersected a protected build, or user requested undo -> **Full Snapshot Rollback** (`nf_rollback`).

## Safety Rules
- Never delete `snapshots/*.json` or `progress-ledger.json` until the entire mission is verified and closed.
- Enforce a circuit breaker (`maxConsecutiveReconnects = 3`): if the server kicks the bot repeatedly (`Banned`, `Whitelist`, `Protocol mismatch`), stop reconnecting, preserve the ledger, and report the exact server kick reason honestly.

## Failure Handling
- **Bot Died / Respawned Far From Build Site:** Read `origin` `(X0, Y0, Z0)` from `progress-ledger.json`, navigate or teleport back to `(X0 - 3, Y0, Z0 + D + 3)`, wait for chunks to load, and resume from the exact interrupted stage.
- **Rollback Snapshot Partially Out of Loaded Chunks:** Move bot near snapshot centroid first (`nf_navigate`) so chunks are loaded in server memory before applying `nf_rollback`.

## Verification
- After `nf_rollback`: `nf_inspect_region` across the snapshot bounding box confirms `0` block mismatches against the pre-operation snapshot record.
- After reconnect/resume: `progress-ledger.json` reflects accurate `toolFailures[]` audit log and clean transition back to `CONSTRUCTING` or `VERIFYING`.

## Fallback Strategies
- If live server is permanently unreachable mid-session, compile remaining blueprint stages offline into standalone `blueprints/*.schem` and vanilla Minecraft `.mcfunction` datapack scripts so construction can be applied immediately once server access resumes.
