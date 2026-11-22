# Changing the girl character into a boy — feasibility

Investigated on a fresh clone of `andrewwoan/aimee-xus-papercraft-world`.
**No production files were modified.** Nothing was deployed.

## Summary

The character appears in **two completely different forms**, and only one of them is cheap to change.

| # | Where | Form | Editable by hand? |
|---|---|---|---|
| 1 | Loading screen | One 512×512 WebP cutout (`/images/head.webp`, `/images/head_smile.webp`), rendered at **80×80 px** | **Yes** — drop-in image swap |
| 2 | 3D scenes (all four seasons) | **Baked mesh geometry** with a shared 2048² texture atlas | **No** — needs mesh editing |

## Why the 3D model can't be repainted

The material is created in `src/Experience/utils/ktxLoader.jsx`:

```js
new THREE.MeshBasicMaterial({ map: texture, transparent, alphaTest: alphaTestValue, ... })
```

`alphaTest: 0.6` looks like the silhouette would come from the texture's alpha — which would make a
repaint sufficient. **It doesn't.** `Moving_Characters_1.webp` is **mode RGB, 2048×2048, with no alpha
channel**, so the alpha test is a no-op against an opaque texture.

The silhouette therefore comes entirely from **mesh geometry**, with UVs assigning colour regions:

- No node in the model contains "hair" — grepped all 29 node names. Hair is not a separable piece.
- The character meshes each occupy a large area of the atlas, so "the atlas region for hair" is not a
  distinct, individually addressable block.
- The atlas is a hand-cut **collage**, not a UV-grid layout, so you cannot simply "recolour the hair
  region" — the pieces are interleaved.
- Decoding the meshes required decompressing `KHR_draco_mesh_compression`
  (`gltf-transform copy` → 133 KB → 1.08 MB) before any UV data was readable; UV accessors in the
  shipped file carry no `min`/`max`.

### What changing the 3D character actually requires

Any of these — all Blender work, then re-run the pipeline:

1. **Edit the source `.blend`** and re-export. ⚠️ The README says materials were stripped from the
   shipped Blender files for licensing reasons, so they are not directly re-exportable.
2. **Import `Moving_Characters-transformed.glb` into Blender**, select the hair pieces, reshape to a
   short cut, and re-unwrap. Because UVs are interleaved, reshaping exposes atlas regions that were
   never authored for those areas, so **new texture work is required alongside the geometry edit**.
3. **Author a new short-haired character** matching the style, re-run
   `npm run gen:models` (`scripts/process_models.js` → Draco + texture transforms) and
   `gltfjsx`, then swap the generated component.

Also note the 3D character is **not one model but four seasonal variants** (Winter front + side,
Spring front + side + bicycle, Summer, Fall) plus two face states each (normal / smile) — 29 meshes.

## Proof of concept (done)

The loading-screen head was regenerated as a boy in the same papercraft style:

- `mockups/head_boy.png` — raw generated edit
- `mockups/head_boy_transparent.png` — background keyed out, cropped, squared to 512²
- `mockups/head_boy_dropin.webp` — WebP, drop-in ready (34 KB vs the original 21.6 KB)

Changes applied: short boy's cut stopping above the jaw (long side locks removed), eyelashes removed,
same brown paper colour and grain, same eyes/smile/face proportions, same torn-paper edges and
shadow. `head_smile.webp` (closed eyes + open smile) still needs the same treatment for the hover
state.

### To ship only the 2D change

```bash
cp mockups/head_boy_dropin.webp public/images/head.webp
# then regenerate head_smile.webp from the same edit, and rebuild + redeploy
```

## Caveats

- The 2D head is only the **loading-screen indicator, 80×80 px** — it is not the character you see in
  the scenes. Changing only this will not make the site read as "a boy's world".
- The 3D character is the identity of the site: the `og-image.webp` social card shows her, the title
  is "Aimee Xu's Papercraft World", and the page copy is first-person about Aimee. A boy character
  would make the site's title and copy inconsistent unless those are changed too.
- The deployed Vercel project is bound to the **upstream** repo, so these changes cannot be pushed
  through it. They need a repo you own (see `REPORT.md` §7).
