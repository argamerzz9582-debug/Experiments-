# Skill: Architect (`architect`)

## Role
Lead architectural designer responsible for translating `reference_analysis.json` (or natural-language briefs) into structurally coherent, aesthetically proportioned, buildable Minecraft architecture with proper depth layering, structural rhythm, circulation, and human/bot ergonomics.

## Capabilities
- Design multi-story structural massing (primary hall, wings, towers, porches, dormers, chimneys).
- Establish structural bay grids (corner columns, intermediate pilasters, horizontal crossbeams, jettied upper floors).
- Define vertical elevation proportions: foundation plinth (`1–2` blocks), ground story (`4–5` blocks), belt course/floor deck (`1` block), upper story (`4` blocks), roof eaves & gable (`4–8` blocks).
- Plan facade composition with **3-layer depth relief**:
  - Outer layer (`z = 0`): structural timber/stone pillars, roof overhangs, window sills/shutters, planter boxes.
  - Primary wall plane (`z = +1`): wall infill (`stone_bricks`, `white_terracotta`, `oak_planks`, etc.).
  - Recessed aperture plane (`z = +1` or `+2`): `glass_pane`, recessed doorways.
- Guarantee playable ergonomics: minimum `2`-wide x `3`-high main entrances, `3+` block interior ceiling clearance, unobstructed `2`-block vertical headroom on every stair step.

## Tools
- **Primary (`nightforge-mcp`):** `nf_compile_blueprint`, `nf_render_view` (`source: "blueprint"`, `mode: "contact_sheet"`)
- **Design Inputs:** `assets/reference/reference_analysis.json`, `block-palette-expert` specifications

## Workflow
1. Read `reference_analysis.json` and site constraints (`origin`, orientation, available footprint) from `progress-ledger.json`.
2. Lock primary structural axes and odd/even symmetry:
   - Choose `W` (X-axis width) and `D` (Z-axis depth) as odd integers (`e.g., 15 x 13` or `17 x 13`) for crisp `1`-block gable ridges and centered entrances.
   - Subdivide `W` and `D` into structural bays of `3` to `5` blocks between vertical `log`/`pillar` columns.
3. Establish vertical section (`Y` offsets relative to `Y0` ground plane):
   - `dy = 0`: Stone plinth / foundation perimeter + interior ground floor slab + exterior entrance steps.
   - `dy = 1..4`: Ground-floor structural columns, recessed infill walls, framed windows (`dy = 2..3`), main entrance doorway (`dy = 1..2` door + `dy = 3` lintel/arch).
   - `dy = 5`: Horizontal ring beam + second-floor deck joists/planks (with stairwell cutout!).
   - `dy = 6..8`: Second-floor walls/kneewalls, balcony or dormer apertures, gable end framing.
   - `dy = 6..12`: Pitched roof planes with `1`-block eave overhang on all four sides (`x = -1`, `x = W`, `z = -1`, `z = D`).
4. Verify interior stairwell geometry mathematically: rising `5` blocks vertically requires `5` horizontal stair treads plus `>= 3` air blocks directly above every tread (`headroom check: air at (sx, sy + 1..3, sz)`).
5. Hand off complete architectural component specification to `blueprint-planner` and preview via `nf_render_view`.

## Decision Rules
- **Never Build Flat "Shoebox" Walls:** Any uninterrupted wall segment longer than `5` blocks MUST be broken up by a structural pillar, window bay, buttress, chimney, or material trim band.
- **Overhang Mandatory on Pitched Roofs:** Pitched roofs must extend `1` block past the structural wall plane along both eaves and gable rakes (with upside-down under-stairs along gable rakes for smooth diagonal profiles).
- **Foundation Grounding:** Heavy materials (`stone_bricks`, `cobblestone`, `andesite`) always anchor `dy = 0` (and `dy = 1` wainscot where appropriate); lighter materials (`planks`, `terracotta`, `wool`) sit above the plinth, never directly on dirt/grass.

## Safety Rules
- Never place open flames (`fire`, uncontained `lava`) adjacent to flammable timber (`logs`, `planks`, `stairs`, `wool`, `leaves`); use `campfire` in stone hearths, `lantern`, `glowstone`, or `torch` with safe clearance.
- Ensure every enclosed room and attic space has deterministic light sources preventing hostile mob spawns (`block light >= 8`).

## Failure Handling
- **Stairwell Collides with Exterior Window or Roof Slope:** Relocate staircase along interior spine or taller central bay near the ridge where roof clearance `>= 3` blocks.
- **Preview Render Reveals Flat/Disproportionate Silhouette:** Adjust roof pitch (`1:1` stair slope vs `1:2` slab slope vs `2:1` alternating stair+full-block steep Nordic pitch) and re-render blueprint contact sheet before touching the live world.

## Verification
- Blueprint contact sheet (`renders/blueprint_preview_sheet.png`) visually inspected via `read_file` across Isometric, Front, Side, and Top views.
- Every floor level is connected by a passable path; stairwell cutout has `>= 3` blocks of vertical headroom at every step.
- Ridge apex aligns cleanly with the symmetry axis (`dx = floor(W / 2)`).

## Fallback Strategies
- If complex diagonal/curved wings exceed site bounds, scale bay count down (e.g. `3` bays instead of `5`) while preserving the `3`-layer facade relief, plinth-to-wall-to-roof proportions, and full interior functionality.
