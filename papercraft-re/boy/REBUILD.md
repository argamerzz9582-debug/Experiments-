# Girl → boy: the full rebuild

The full rebuild was requested, so this replaces [CHARACTER.md](../CHARACTER.md)'s conclusion
("the 3D character needs Blender work") with an actually-executed geometry edit.

**Status: 4 of 6 seasonal views converted. Files built, verified and ready to deploy.**

## What was built

| File | Replaces | What it is |
|---|---|---|
| `Moving_Characters-transformed.glb` | `public/models/…` | The 3D character, re-cut with short hair in 4 views |
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
| Winter side (profile) | ❌ unchanged — hair mass is shared with the body mesh |
| Fall (double-bun + braids) | ❌ unchanged — buns and braids need new geometry, not a cut |

The two unconverted views are honest gaps, not oversights: a profile silhouette has no separable
hair piece to cut, and bun/braid hairstyles cannot be shortened by compressing a single mass.

## Reproducing

```bash
# 1. decode the shipped GLB (keeps node TRS, strips Draco)
cd tools && node decode.mjs            # -> mc_decoded.glb

# 2. deform + write back
python3 boyify_glb.py                  # -> Moving_Characters-boy-raw.glb

# 3. re-compress with Draco
node compress.mjs                      # -> Moving_Characters-transformed-boy.glb

# 4. verify visually (no browser, no GPU)
node dump_world.mjs <glb> /tmp/mc_flat.json
python3 sheet.py                       # -> all six views rendered
```

`tools/glbtool.py` contains the GLB reader/writer; it was validated by round-tripping 30
primitives with no modification and confirming all 30 world-space vertex sets were unchanged.

## Deploying

Drop the three files into the upstream tree and rebuild:

```bash
cp boy/Moving_Characters-transformed.glb public/models/
cp boy/head.webp boy/head_smile.webp        public/images/
npm run build && vercel deploy --prod
```

As noted in [REPORT.md](../REPORT.md) §7, the existing Vercel project is bound to the **upstream**
repo, so this cannot be pushed through it — it needs a repo under your own account.

## Caveats

- The site's title ("Aimee Xu's Papercraft World") and its first-person copy about Aimee are
  unchanged. A boy character makes those inconsistent until they are updated too.
- `og-image.webp` (the social card) still shows the girl.
- These are geometric edits to an MIT-licensed derivative — the attribution requirements in the
  upstream `LICENSE.md` still apply.
