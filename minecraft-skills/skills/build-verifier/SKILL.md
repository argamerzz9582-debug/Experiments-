# Skill: Build Verifier (`build-verifier`)

## Role
Independent quality-assurance inspector and structural auditor that compares the live Minecraft server chunks against both the compiled coordinate blueprint and the original architectural reference across **12 mandatory engineering gates**, flagging every missing, misoriented, floating, dark, or inaccessible block before completion can be claimed.

## Capabilities
- Scan the entire 3D live world bounding box `[X0 - margin .. X0 + W + margin]` directly from server chunks.
- Perform **exact voxel-by-voxel diffing** (`liveBlock.name` and critical directional properties `facing`, `half`, `axis`, `type`, `open`) against `blueprint.voxels`.
- Run **3D connected-component support graph analysis** to detect any **floating blocks** disconnected from the ground plane `y = Y0 - 1`.
- Audit **bilateral symmetry** across the architectural symmetry plane (`dx` vs `W - 1 - dx`), respecting intentional asymmetric features (such as a single side chimney or interior staircase).
- Verify **roof watertightness** (vertical sky-ray cast over every interior column).
- Compute **interior block-light propagation** (`Manhattan attenuation from light=15/14 emitters`) to flag any dark mob-spawnable floor tiles (`light < 8`).
- Run **3D A*/BFS player-hitbox (`1w x 2h`) walkability flood-fill** from the exterior approach road, up the front steps, through the main entrance doorway, across all ground-floor rooms, and up the interior staircase to the second floor!
- Render a **4-panel live world verification contact sheet** (`renders/live_world_final_verified.png`) and inspect it visually.

## Tools
- **Primary (`nightforge-mcp`):** `nf_verify_structure`, `nf_inspect_region`, `nf_render_view` (`source: "world"`, `mode: "contact_sheet"`), `nf_entities`
- **Visual Confirmation:** Host `read_file` on rendered live-world PNGs

## Workflow
1. Wait `500 ms` after the final construction stage so any pending server physics ticks settle.
2. Invoke `nf_verify_structure` passing `blueprintPath` and `referenceAnalysisPath`.
3. Evaluate all **12 Phase-9 Inspection Gates**:
   1. **Dimensions:** Live occupied bounding box `(W_live, H_live, D_live)` matches target blueprint dimensions.
   2. **Symmetry:** Facade structural frame, roof slopes, and paired bay windows match across symmetry axis (`>= 98%` structural shell symmetry).
   3. **Missing Blocks:** `missingBlocks.length === 0` (`0` target solid/attachment blocks still `air` in live world).
   4. **Floating Blocks:** `floatingBlocks.length === 0` (`0` non-air blocks lacking a 6-connected path to terrain base `y = Y0 - 1`).
   5. **Structural Gaps:** `0` unintended breaches in foundation plinth, exterior wall envelope, or floor decks.
   6. **Roof Completeness:** `0` vertical sky leaks over interior rooms (`100%` overhead coverage).
   7. **Window Consistency:** All planned window openings contain intact `glass_pane`/`glass` at uniform sill heights with matching trim.
   8. **Interior Completion:** Required workstation, storage, hearth/living, upper-floor furnishing, and internal stairs present and unobstructed.
   9. **Lighting:** `100%` of walkable interior floor tiles meet `estimatedBlockLight >= 8`.
   10. **Landscaping:** Exterior walkway, entrance lanterns, and perimeter plantings present without decaying foliage.
   11. **Entrance Accessibility:** 3D `1x2` player walkability BFS reaches from exterior road `(X0 + midX, Y0, Z0 + D + 2)` -> Ground Floor Foyer -> Great Hall -> Upper Floor Loft (`reachable === true`).
   12. **Reference Similarity:** Aspect ratio, story count, roof pitch, window rhythm, and palette match `reference_analysis.json` (`similarityScore >= 0.85`).
4. Render live-world screenshots (`nf_render_view` `source: "world"`) and visually inspect via `read_file`.
5. If ANY gate fails (`passed === false`), write full defect coordinates to `progress-ledger.json` and hand off immediately to `repair-agent`.
6. Only when `12 / 12` gates pass, mark `verificationStatus: "PASSED"` and generate `reports/PHASE9_FINAL_VERIFICATION_REPORT.md`.

## Decision Rules
- **Blockstate Equivalence Tolerance:** Treat dynamic auto-connecting neighbor properties (`fence[north=true]`, `glass_pane[east=true]`, `stairs[shape=outer_left]` computed by server neighbors) as valid when base block name + primary placement properties (`facing`, `half`, `axis`) match, while flagging wrong block types or backwards `facing`/`half` as hard defects!
- **Door Passability in Walkability BFS:** Closed wooden doors (`oak_door`, `spruce_door`) ARE player-interactable and walkable (`2` blocks tall when opened), whereas iron doors without buttons or `1`-block holes are NOT walkable.

## Safety Rules
- `build-verifier` is strictly **non-destructive and read-only** — it diagnoses and catalogs defects accurately without mutating blocks itself; mutations belong exclusively to `repair-agent`.
- Never pass a build based on command exit codes alone; ONLY live chunk reads (`bot.blockAt`) count as ground truth!

## Failure Handling
- **Stale Client Chunk Cache Suspected:** Navigate bot around building perimeter (`nf_navigate`) to force fresh chunk/block_change synchronization before re-scanning.

## Verification
- Structured JSON report + `reports/PHASE9_FINAL_VERIFICATION_REPORT.md` emitted with exact quantitative counts for all 12 gates and visual live-world render PNG confirmed via `read_file`.

## Fallback Strategies
- If bounding box exceeds single-call scan limits (`> 100,000` voxels), scan slice-by-slice along `Y` layers and aggregate defect lists deterministically.
