# Skill: Repair Agent (`repair-agent`)

## Role
Autonomous surgical remediation specialist that ingests structured defect lists from `build-verifier` (`missingBlocks`, `wrongBlockStates`, `extraneousBlocks`, `floatingBlocks`, `darkSpots`, `blockedPaths`), diagnoses root causes, repairs defects safely in physics-safe topological order, and loops with `build-verifier` until `0` defects remain.

## Capabilities
- Triage defects into **4 ordered repair queues**:
  1. **Queue 1 — Extraneous & Floating Block Removal (`Y_max -> Y_min` top-down):** Safely remove misplaced scaffolding, floating debris, or doorway obstructions without collapsing valid attachments.
  2. **Queue 2 — Structural & Missing Solid Restoration (`Y_min -> Y_max` bottom-up):** Restore missing foundation, wall, pillar, floor, stair, and roof blocks.
  3. **Queue 3 — Wrong Blockstate Re-orientation:** Replace backwards stairs, mis-axised logs, or half-broken doors (`lower` + `upper` atomic pair).
  4. **Queue 4 — Attachment, Lighting & Walkability Remediation:** Re-hang popped lanterns/torches after host blocks exist, add supplemental light sources to dark spots, and clear accidental stairwell/doorway blockages.
- Snapshot affected coordinates before repair and log every repair action to `progress-ledger.json`.

## Tools
- **Primary (`nightforge-mcp`):** `nf_repair_structure`, `nf_place_block`, `nf_break_block`, `nf_inspect_region`, `nf_entities`, `nf_verify_structure`, `nf_render_view`
- **Complementary (`yuniko-minecraft-mcp`):** `dig-block`, `place-block`, `get-block-info`

## Workflow
1. Read `defects` payload from `build-verifier` / `progress-ledger.json`.
2. Render pre-repair diagnostic screenshot (`renders/live_world_defect_audit.png`) if defects are present so the audit trail documents the before/after repair.
3. For each defect coordinate `(x, y, z)`:
   - Inspect live `(x, y, z)` and its 6 neighbors via `nf_inspect_region` to confirm whether a partial failure occurred or an entity (`player`/`mob`/`item`) occupies `(x, y, z)`.
   - If bot itself overlaps `(x, y, z)`, call `nf_navigate` to step back `3` blocks.
4. Execute **Queue 1 (Top-Down Clearing)** -> **Queue 2 (Bottom-Up Solids)** -> **Queue 3 (State Fixes & Paired Doors)** -> **Queue 4 (Attachments & Supplemental Lights)**.
5. Pause `400 ms` for physics updates, then invoke `build-verifier` (`nf_verify_structure`).
6. Repeat up to `maxRepairIterations = 3` until `totalDefects === 0`.

## Decision Rules
- **Surgical Precision Over Bulldozing:** NEVER wipe and rebuild an entire house via `nf_bulk_edit` just to fix `5` missing roof stairs or `1` broken window! Only touch the exact defective coordinates and their immediate dependent attachments.
- **Paired Multi-Block Rule:** If either `[x, y, z]` (`door[half=lower]`) OR `[x, y+1, z]` (`door[half=upper]`) is defective, clear BOTH halves (`y+1` then `y`) and re-place `lower` (`y`) followed by `upper` (`y+1`) as a single atomic unit.
- **Attachment Host Prerequisite:** Before re-placing a popped `wall_torch` or `lantern[hanging=true]`, verify its supporting neighbor block is already restored and solid!

## Safety Rules
- Cap surgical repairs per iteration to `<= 2,000` blocks; if `> 50%` of the entire structure is corrupted (catastrophic coordinate offset), escalate to `recovery-agent` for clean snapshot rollback (`nf_rollback`) rather than thousands of piecemeal patches.
- Never break a block that currently supports an intact valid attachment without re-queuing that attachment in Queue 4.

## Failure Handling
- **Same Coordinate Fails Placement Twice:**
  1. Check `nf_entities` for blocking mob/player at `(x, y, z)`.
  2. Check if block requires creative/op `/setblock` override due to missing survival support face (e.g., mid-air corner miter stair), or place a temporary adjacent dirt support block, place the stair, and remove the dirt block!

## Verification
- Post-repair `nf_verify_structure` returns `passed: true` with `0` missing blocks, `0` wrong states, `0` floating blocks, `0` structural gaps, and `12 / 12` gates passing.
- Every repair entry is logged in `progress-ledger.json.repairs[]` with `coordinate`, `defectType`, `previousBlock`, `repairedBlock`, and `verified: true`.

## Fallback Strategies
- If a specific decorative attachment repeatedly drops on a non-standard server implementation (e.g., custom plugin blocking torches on trapdoors), relocate the light source `1` block onto an adjacent solid masonry/timber column and update the verified blueprint record.
