# Skill: Reference Analyzer (`reference-analyzer`)

## Role
Computer-vision and architectural proportion specialist that transforms input architectural images, screenshots, sketches, or multi-frame construction videos into structured quantitative design briefs (`reference_analysis.json`) without inventing false precision where visual evidence is occluded.

## Capabilities
- Decode static images (`.png`, `.jpg`, `.jpeg`) and multi-frame video sequences using perceptual frame-novelty filtering (`Visual2Craft` method).
- Segment foreground architectural mass from sky/ground background to measure width-to-height aspect ratio, eave line, and ridge line.
- Detect roof silhouette geometry (`gable`, `hip`, `flat`, `gambrel`, `mansard`, `spire/conical`, `shed`) and estimate roof-to-wall height ratio.
- Measure horizontal symmetry (`0.0` asymmetric to `1.0` bilateral mirror) and vertical bay rhythm (pillar/window spacing).
- Cluster dominant surface colors in RGB/perceptual space and map clusters to candidate Minecraft block families (foundation stone, timber frame, wall infill, roof shingle, trim/glazing).
- Explicitly separate **Observed Facts** from **Estimated Architectural Priors** with confidence intervals.

## Tools
- **Primary (`nightforge-mcp`):** `nf_analyze_reference` (executes `nightforge/scripts/analyze_reference.py` powered by `Pillow` + `numpy`)
- **Host Vision Inspection:** `read_file` on reference image(s) and extracted contact sheets for direct multimodal visual reasoning

## Workflow
1. Verify reference file(s) exist in workspace (`assets/reference/...`). If input is a multi-frame directory or video frames, sample candidates and discard near-duplicate neighboring frames using thumbnail L1 color delta + Laplacian sharpness tie-breaking.
2. Inspect the reference visually (`read_file`) AND run `nf_analyze_reference` to extract quantitative image statistics:
   - Bounding silhouette `[x_min, y_min, x_max, y_max]`
   - Aspect ratio `W_px / H_px`
   - Roof apex offset and slope angle (`dy_roof / dx_halfspan`)
   - Bilateral symmetry score across vertical centerline
   - Horizontal band transitions (plinth -> ground story -> upper story -> gable/roof)
   - K-means / quantized dominant color swatches mapped to closest Minecraft block RGB profiles
3. Translate pixel proportions into Minecraft block units using human-scale anchors:
   - Standard door height = `2` blocks (`3` blocks with transom/arch).
   - Standard floor-to-ceiling story height = `4` to `5` blocks (`1` floor slab + `3–4` interior air).
   - Odd bay widths (`3`, `5`, `7` blocks) preferred so windows and doors have exact center blocks.
4. Record explicit uncertainty flags for unseen faces (e.g., `"rear_elevation": "inferred_from_front_symmetry"`, `"interior_layout": "synthesized_from_floor_count_and_windows"`).
5. Write structured output to `assets/reference/reference_analysis.json` and `reports/PHASE6_REFERENCE_TO_BLUEPRINT.md`.

## Decision Rules
- **Odd-Dimension Snap:** If estimated facade width is `14.2` blocks and symmetry score `>= 0.78`, snap facade width `W` to `15` (odd integer) so the ridge apex, double/single entrance, and central gable window align cleanly without 2-block-wide awkward centers.
- **Depth Estimation from Single Front/3-Quarter View:**
  - Front-only view: estimate depth `D = odd_snap(round(W * 0.75))` unless typological cues indicate tower (`D = W`) or hall (`D = odd_snap(round(W * 1.25))`).
  - Three-quarter isometric view: decompose horizontal span into `W_proj` and `D_proj` via vertical corner edge detection.
- **Shader / Lighting Compensation:** Warm sunset shaders shift white wool/calcite/birch toward orange; cross-check luminance contrast rather than raw hue alone before picking orange terracotta over birch/sandstone/spruce.

## Safety Rules
- **Epistemic Honesty:** Never claim exact block counts from a blurred or non-Minecraft real-world photo; always report `confidence` (`high | medium | inferred`) per dimension and facade.
- **Scale Cap:** Cap automatically inferred footprints to `64 x 64 x 64` unless the user explicitly requests mega-scale construction, ensuring reliable single-session completion and verification.

## Failure Handling
- **Low Foreground Contrast / Cluttered Background:** Fall back from global thresholding to center-weighted vertical edge gradient projection and multimodal visual inspection via `read_file`.
- **Corrupted or Unreadable Frame:** Skip unreadable frames, log warning in analysis JSON, and proceed on remaining valid frames.

## Verification
- `reference_analysis.json` contains valid numeric `estimatedDimensions` (`widthX`, `depthZ`, `heightY`, `stories`, `wallHeight`, `roofHeight`), `symmetryScore`, `roofType`, `colorClusters`, and `recommendedPalette`.
- Every inferred hidden side (back wall, interior partitions) is explicitly annotated as `inferred: true`.

## Fallback Strategies
- If Python `Pillow`/`numpy` is unavailable, run pure-Node PNG/JPEG pixel sampler (`pngjs` / `jpeg-js`) combined with direct multimodal inspection via `read_file`.
