# PHASE 6 — ARCHITECTURAL REFERENCE-TO-BLUEPRINT REPORT

**Reference Image:** `assets/reference/nordic_guildhall_reference.png` (`1536x1024`)  
**Analysis Output:** `assets/reference/reference_analysis.json`  
**Compiled Blueprint:** `blueprints/nordic_guildhall_blueprint.json`  
**Sponge Schematic v2:** `blueprints/nordic_guildhall.schem` (Lossless Round-Trip Verified: `true`, `0` mismatches across `2517` blocks)  
**Architectural Plans & BOM:** `blueprints/nordic_guildhall_plans.md`

---

## Step 1 — Visual Analysis Summary
- **Overall Silhouette:** Two-story Nordic medieval timber-and-stone guildhall with steep front-facing gable, side cross-gable wing, and stone chimney stack on East side
- **Roof Geometry:** 45-degree (1:1) pitched dark-wood gable roof with stepped stone-brick rake overhangs, upside-down soffit stairs, side cross-gable, and smoking masonry chimney
- **Main Entrance:** Recessed central double oak doorway framed by arched timber/stone trim, flanked by hanging lanterns, approached via wide stone-brick steps
- **Second-Story Balcony:** Recessed second-story central loggia/balcony above main entrance with dark spruce fence balustrade and hanging lanterns
- **Fenestration & Shutters:** Recessed paned windows on ground stone wall, upper cream plaster bays, and central attic gable, each framed by dark spruce shutters
- **Structural Framing:** Full-height vertical dark spruce log columns on corners and bay divisions tied by horizontal spruce crossbeams and corbels
- **Landscaping & Courtyard:** Stone-brick front courtyard plaza and perimeter path, geometric 2-block-high oak-leaf hedges, and 4 symmetrical courtyard lantern posts

## Step 2 — Dimension & Proportion Estimation
- **Structural Width (X):** `17` blocks (`dx = 3..19`, confidence: `high`)
- **Structural Depth (Z):** `15` blocks (`dz = 2..16`, confidence: `medium_high`)
- **Roof Envelope (with 1-block overhangs):** `19 x 17` blocks (`dx = 2..20, dz = 1..17`)
- **Full Site Envelope (with Courtyard, Hedges & 4 Lantern Posts):** `23 (X) x 20 (Y) x 23 (Z)` blocks
- **Symmetry Axis:** Bilateral mirror across `dx = 11` (`X = 3`), with explicit epistemic annotations for the unseen rear facade and synthesized guildhall interior.

## Step 3 — Extracted Dominant Color Clusters -> Block Palette Mapping
| RGB Centroid | Share | Matched Minecraft Block | Role |
|---|---:|---|---|
| `rgb(27, 23, 15)` | 28.0% | `spruce_log` | `timber_frame` |
| `rgb(101, 96, 75)` | 14.5% | `stripped_spruce_log` | `timber_beam` |
| `rgb(82, 67, 43)` | 14.2% | `spruce_planks` | `floor_wood` |
| `rgb(42, 50, 50)` | 12.5% | `dark_oak_planks` | `roof_field` |
| `rgb(57, 41, 23)` | 12.4% | `spruce_log` | `timber_frame` |
| `rgb(131, 121, 107)` | 11.9% | `stone_bricks` | `masonry` |
| `rgb(172, 160, 146)` | 6.5% | `birch_planks` | `wall_infill_wood` |

## Step 4 — Surveyed Live World Placement Coordinates
- **Selected Origin `(X0, Y0, Z0)`:** `(-8, 4, 4)`
- **World Bounding Box:** `[-8, 4, 4] -> [14, 23, 26]`
- **Protected Structures Avoided:** `1` (player chest at `(-6, 5, -6)` kept completely untouched outside buffer)
- **Earthwork Required on Chosen Pad:** `0` surface blocks cleared/leveled
