# Skill: Structural Builder (`structural-builder`)

## Role
Primary vertical and horizontal superstructure engineer responsible for constructing load-bearing columns, crossbeams, recessed/framed exterior walls, interior load-bearing partitions, upper-story floor decks, and inter-floor staircases.

## Capabilities
- Erect vertical corner and bay pillars (`spruce_log[axis=y]`, `oak_log[axis=y]`, `stone_bricks`) with exact axial alignment (`axis=x | y | z`).
- Tie columns together with horizontal ring beams and crossbeams (`stripped_spruce_log[axis=x]`, `stripped_spruce_log[axis=z]`) at story transitions (`dy = 4` or `5`).
- Build recessed infill walls leaving accurately framed window openings and doorway rough openings (`2x3` or `1x2` + lintel).
- Construct upper-floor decks with clean **stairwell openings** and protective balustrades (`oak_fence` / `spruce_fence`).
- Build code-compliant Minecraft staircases (`stairs[facing=...,half=bottom]`) with inverted under-stairs (`[half=top]`) for clean soffit diagonals and `>= 3` blocks of vertical headroom at every step.

## Tools
- **Primary (`nightforge-mcp`):** `nf_build_blueprint` (`03_structural_frame`, `04_exterior_walls`, `05_floors_and_stairs`), `nf_bulk_edit`, `nf_place_block`, `nf_inspect_region`
- **Complementary (`yuniko-minecraft-mcp`):** `place-block`, `dig-block`, `move-to-position`

## Workflow
1. Confirm `02_foundation` passed verification in `progress-ledger.json`.
2. **Stage `03_structural_frame`:**
   - Build vertical `axis=y` corner pillars and intermediate bay pillars from `dy = 1` up to `dy = eave_height`.
   - Install horizontal `axis=x` and `axis=z` ring beams tying all column tops together at floor transitions and eaves.
3. **Stage `04_exterior_walls`:**
   - Fill wall panels between columns using `nf_bulk_edit` (for solid wall segments) or staged coordinates, leaving crisp rough openings for doors and windows.
   - Build gable end walls (`dz = 0` and `dz = D - 1` or `dx = 0` and `dx = W - 1`) stepped inward to match exact roof slope.
4. **Stage `05_floors_and_stairs`:**
   - Lay upper-story floor deck at `dy = 5`, explicitly preserving the stairwell opening (`air` cutout).
   - Construct interior staircase ascending from `dy = 1` to `dy = 5` with continuous `3`-block headroom clearance above each tread.
   - Install guardrail fences around the upper stairwell perimeter to prevent falls.

## Decision Rules
- **Log Axis Discipline:** Vertical pillars MUST use `[axis=y]`; E–W beams MUST use `[axis=x]`; N–S beams MUST use `[axis=z]`. Exposed bark ends on the side of a horizontal beam are treated as orientation defects unless intentionally modeling protruding beam tails!
- **Depth Relief Enforcement:** Whenever wall thickness budget permits (`W, D >= 11`), offset structural pillars `1` block proud of wall infill OR recess window glazing (`glass_pane`) behind `1`-block full-wall reveals.
- **Execution Mode Selection:**
  - Op / WorldEdit available: batch solid wall rectangles with `nf_bulk_edit`, then place axial logs & stairs via state-exact `nf_place_block` / `nf_build_blueprint`.
  - Survival Mineflayer bot: build layer-by-layer (`dy = 1`, then `dy = 2`, ...) standing on temporary scaffolding or completed floors within `4.5`-block reach.

## Safety Rules
- Never seal the bot inside a windowless room or wall cavity; track bot position relative to closed wall loops and keep door openings unblocked during construction.
- Verify every stair tread has `air` at `(x, y+1, z)`, `(x, y+2, z)`, and `(x, y+3, z)` so players never hit their heads ascending or descending.

## Failure Handling
- **Misoriented Log or Stair (`axis` or `facing` mismatch):** Inspect via `nf_inspect_region`, clear or overwrite with explicit blockstate string (`spruce_stairs[facing=north,half=bottom,shape=straight]`).
- **Out-of-Reach Placement in Survival Mode:** Delegate to `pathfinding-expert` (`nf_navigate` to within `3.5` blocks of target) or erect temporary dirt/scaffolding pillar and remove on descent.

## Verification
- All structural columns continuous from `dy = 1` to eave beam with `0` air gaps.
- Bilateral symmetry of structural frame and window rough openings verified across symmetry axis.
- Staircase connects Ground Floor (`dy = 1`) to Upper Floor (`dy = 6` standing surface on `dy = 5` deck) with passable 3D walkability check.

## Fallback Strategies
- If `stripped_*_log` is unavailable, use standard `*_log` or `*_planks` beams.
- On survival servers with Baritone client mod available, export `03`–`05` stages to `.schem` and invoke `#build nordic_guildhall.schem X0 Y0 Z0`.
