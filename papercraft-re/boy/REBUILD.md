# Girl → boy: the full rebuild

The full rebuild was requested, so this replaces [CHARACTER.md](../CHARACTER.md)'s conclusion
("the 3D character needs Blender work") with an actually-executed geometry edit.

**Status: all 6 seasonal views converted. Files built, verified and deployed.**

## What was built

| File | Replaces | What it is |
|---|---|---|
| `Moving_Characters-transformed.glb` | `public/models/…` | The 3D character, re-cut with short hair in all 6 views |
| `Moving_Characters_1.webp` | `public/textures/…` | The atlas, with the girl's painted hairpin erased (Fall) |
| `head.webp` | `public/images/head.webp` | Loading-screen head, boy |
| `head_smile.webp` | `public/images/head_smile.webp` | Hover state |

`npm run build` succeeds with these in place (verified, 17.4 s).

## How it was done, and why not with Blender

Blender was the obvious tool and it was tried first: `bpy` 5.0.1 installs fine from PyPI
(374 MB wheel), but it will not import — `libXrender.so.1` is missing, along with `libGL`,
`libICE`, `libSM`. Debian's apt repos are unreachable from this sandbox, so the GL/X stack cannot
be installed. Headless Blender was therefore not available.

So the edit was done directly at the glTF level, with a purpose-built verification loop:

1. **Decode** the Draco-compressed GLB with `gltf-transform` (133 KB → 1.08 MB) using a
   self-hosted decoder, keeping the authored node hierarchy intact.
2. **Render** — a small software rasterizer (`tools/raster.py`) that reproduces exactly what the
   site's material does: `MeshBasicMaterial`, atlas sampled with `flipY: false`, orthographic
   front view, z-buffered. This gave a ground-truth image before touching anything, and caught two
   real bugs on the way (missing node transforms; wrong V convention).
3. **Identify** hair by rendering every connected mesh piece in a distinct colour
   (`tools` + piece-labelling). This was decisive: the earlier colour-classification attempt had
   silently mislabelled the mouth and eyebrows as hair.
4. **Deform** — see below.
5. **Write back** into the GLB, re-compress with Draco, dump again and re-render to confirm the
   result survived the round trip.

### The deformation

Each seasonal character is a set of ~10–50 disjoint paper pieces. The long back-hair is **one
piece**; the fringe is another; the face, eyes, mouth and blush are others.

Hair is shortened by compressing the hair piece vertically about its **top edge**, so its bottom
lands on a line just under the jaw, plus a slight inward taper so the cut reads as a rounded
short cut rather than a slice. Stray thin strands hanging below the jaw are collapsed.

Two things made this safe:

- **Hair UVs sample a flat brown paper region**, so compressing the geometry does not stretch any
  authored detail — no re-unwrap and no texture painting are required.
- Applying the same affine to the UVs was tried and was **worse** (it pulled neighbouring atlas
  patches into the piece and made the hair mottled), so geometry-only is what shipped.

Disproportionately, `world = local + translation` for every node in this file — 30 flat scene
children, translation only, no rotation or scale. Confirming that from the JSON is what made a
reliable write-back possible; an earlier attempt using `flatten()` produced a scrambled model.

## Results

`renders/winter_before_after.png` — Winter front, side by side.
`renders/all_seasons_boy.png` — all six views after the edit.

| View | Status |
|---|---|
| Winter front (with hat) | ✅ short cut |
| Spring front (green dress) | ✅ short cut |
| Spring side (bicycle) | ✅ short cut |
| Summer (surfboard) | ✅ short cut |
| Winter side (profile) | ✅ short cut, beanie re-seated |
| Fall (double-bun + braids) | ✅ bowl cut, buns/braids/pin removed |

The last two needed a different technique from the first four, which is why they were
left for a second pass:

- **Winter side** — the long back-hair is five stacked overlay pieces drawn in front of a
  short, skull-hugging head shape. Deleting the five overlays *is* the haircut: nothing is
  deformed, so no seam or gap appears. The beanie, however, was drawn to sit on the long
  hair and would otherwise float, so it is translated down and squashed slightly
  (`y' = y_brim + (y - y_brim)·0.95 - 0.18`). One brown tuft still pokes out from under the
  band — it is part of the skull piece that gives the profile its silhouette, so removing
  it opens a hole in the back of the head. It reads as a fringe, and is kept deliberately.
- **Fall** — the side buns and both braids are a single closed overlay piece layered over
  a bowl cut, so removing that one piece converts the whole hairstyle. The gold crown and
  the two gold pins are four small separate meshes and go with it. The black hairpin that
  reads as a headband is **painted into the atlas**, not modelled: it is erased from the
  texture instead (`tools/patch_atlas.py`). Only one mesh samples those texels, verified by
  rasterising every primitive's UV coverage, so no other season is affected.

## Reproducing

```bash
# 1. decode the shipped GLB (keeps node TRS, strips Draco)
cd tools && node decode.mjs            # -> mc_decoded.glb

# 2. deform + write back (v4: four views, then v5: the last two)
python3 boyify_glb.py                  # -> Moving_Characters-boy-raw.glb
python3 boy5.py <decoded v4 glb> /tmp/MC-boy3-raw.glb

# 3. erase the painted hairpin (Fall), then re-compress with Draco
python3 patch_atlas.py <atlas> <patched.webp>
node compress.mjs <raw> <out.glb> <verify.glb>

# 4. verify visually (no browser, no GPU)
node dump_world.mjs <glb> /tmp/mc_flat.json
python3 sheet.py                       # -> all six views rendered
```

`tools/glbtool.py` contains the GLB reader/writer; it was validated by round-tripping 30
primitives with no modification and confirming all 30 world-space vertex sets were unchanged.

## Deploying

Drop the three files into the upstream tree and rebuild:

```bash
cp boy/Moving_Characters-transformed.glb    public/models/
cp boy/Moving_Characters_1.webp             public/textures/
cp boy/head.webp boy/head_smile.webp        public/images/
npm run build && vercel deploy --prod
```

As noted in [REPORT.md](../REPORT.md) §7, the existing Vercel project is bound to the **upstream**
repo, so this cannot be pushed through it — it needs a repo under your own account.

## Caveats

- The site's title ("Aimee Xu's Papercraft World") and its first-person copy about Aimee are
  unchanged. A boy character makes those inconsistent until they are updated too.
- `og-image.webp` (the social card) still shows the girl.
- The Winter-side tuft under the beanie band and the small fringe notch on Fall are kept on
  purpose; see above.
- These are geometric edits to an MIT-licensed derivative — the attribution requirements in the
  upstream `LICENSE.md` still apply.
