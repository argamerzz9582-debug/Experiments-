# Skill: Roof Specialist (`roof-specialist`)

## Role
Roof geometry, overhang, gable rake, ridge cap, dormer, and chimney specialist ensuring every building is crowned with a watertight, structurally supported, visually striking roof free of holes, stair-corner glitches, or flat monotonous caps.

## Capabilities
- Generate mathematically exact roof geometries:
  - **Classic 45° Gable (`1:1` pitch):** `stairs[half=bottom]` ascending `1` Y per `1` X/Z step, paired with upside-down `stairs[half=top]` along gable rakes for smooth diagonal soffits.
  - **Steep Nordic / Medieval Gable (`2:1` pitch):** alternating full block + stair per horizontal step for dramatic A-frame halls and watchtowers.
  - **Low-Slope Shed / Porch Roof (`1:2` pitch):** alternating `slab[type=bottom]` and `slab[type=top]`.
  - **Hipped & Pyramidal Tower Roofs:** auto-mitering `shape=outer_left | outer_right` corner stairs.
- Construct `1`-block eave and gable overhangs (`dx = -1, W` and `dz = -1, D`) framed in contrasting stone-brick or dark-wood trim.
- Integrate roof dormers, attic gable windows, ridge finials, and smoking stone chimneys (`campfire` concealed inside chimney crown surrounded by `stone_brick_wall` / trapdoors).

## Tools
- **Primary (`nightforge-mcp`):** `nf_build_blueprint` (`section: "06_roof_system"`), `nf_place_block`, `nf_inspect_region`, `nf_render_view`

## Workflow
1. Verify `03_structural_frame` and `04_exterior_walls` (including stepped gable end walls) are complete so roof planks/stairs have backing support.
2. Build roof layers strictly **from eaves upward to the ridge (`dy_eave -> dy_ridge`)**:
   - Place outer gable trim rakes (`stone_brick_stairs`) at front and rear overhangs (`dz = -1` and `dz = D` or `dx = -1` and `dx = W`).
   - Place upside-down soffit stairs (`stone_brick_stairs[half=top,facing=...]`) underneath each gable rake step so the roofline forms a continuous zig-zag-free diagonal!
   - Fill main roof field runs between front and back rakes (`spruce_stairs` / `dark_oak_stairs` facing outward-up-slope: West slope faces `east`, East slope faces `west`!).
3. Crown the central apex (`dx = floor(W / 2)` for odd `W`) with a continuous ridge beam (`stone_brick_slab[type=bottom]` over full ridge beam `stripped_spruce_log` or decorative cresting) with raised finial posts at both gable tips.
4. Construct masonry chimney stack penetrating cleanly through the roof slope up to `>= 2` blocks above adjacent roof blocks, topped with safe `campfire` + `spruce_trapdoor` spark arrestors if included in blueprint.
5. Inspect top-down (`nf_render_view` `mode: "top"`) to verify zero vertical sky holes into the interior!

## Decision Rules
- **Stair Facing Rule (Critical!):** In Minecraft, a stair's `facing` property points toward its **tall back side**!
  - Therefore, a roof slope on the **West (`-X`) side** rising toward the **East (`+X`)** ridge MUST have `facing=east,half=bottom`!
  - Its underside upside-down rake stair on the West side MUST face `west` (`facing=west,half=top`)!
  - Reversing `facing` creates jagged backward steps — double-check every slope vector before compiling!
- **Odd vs. Even Span Ridge:**
  - Odd width `W` (`e.g., 15`): slopes meet at single central column `dx = 7`, capped with `slab` or ridge crest.
  - Even width `W` (`e.g., 14`): slopes meet across double columns `dx = 6, 7`, capped with paired stairs or flat `2`-wide ridge cap.

## Safety Rules
- Never place flammable wood roof blocks directly touching unshielded `fire` or `lava`; campfires do NOT spread fire in Minecraft Java Edition, making `campfire` 100% safe for chimney smoke!
- Light the underside of steep attic roofs (`lantern[hanging=true]` from ridge beam) so dark roof rafters never spawn mobs.

## Failure Handling
- **Backwards Roof Stair Row Detected in Render/Verifier:** Overwrite the affected row immediately with corrected `facing` property via `nf_place_block` / `nf_repair_structure`.
- **Bot Falls Off Steep Roof in Survival Mode:** Enable sneak (`controlState('sneak', true)`) or construct from interior attic scaffolding below the roof deck.

## Verification
- **Watertightness Check:** For every interior column `(x, z)` inside `[X0 + 1 .. X0 + W - 2] x [Z0 + 1 .. Z0 + D - 2]`, scanning downward from `Y_max` encounters a roof block BEFORE encountering any interior room air! (`0` sky leaks).
- Eave and gable overhangs are bilaterally symmetric across the ridge axis.

## Fallback Strategies
- If stair directional placement is unreliable on a custom/legacy protocol proxy, construct stepped `slab[type=bottom]` / full-block `1:2` pitch roofs which have zero horizontal `facing` sensitivity!
