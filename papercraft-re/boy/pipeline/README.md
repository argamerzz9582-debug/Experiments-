# Boy rebuild — procedural papercut pipeline

This is the actual pipeline that produced the shipped boy asset. It exists because
`papercraft-re/boy/MODEL-SPEC.md` says the look lives in the **drawing** and the
**silhouette**, not in 3D detail — so the model is generated from hand-painted 2D art
instead of modelled.

Method follows `elithril/blender-kiln` (`plugin/references/characters.md`,
"stylised humanoid"): one skin/head reused across poses, hair as a cap + chunky locks
(never a shell), a designed palette and layered costume, and a review loop of
front / ¾ / side / head-closeup renders before delivery.

## Order

```bash
V=/path/to/venv        # bpy + pillow + numpy + opencv-python-headless
PY=$V/bin/python

$PY pipeline/atlas.py                        # -> atlas.png (2048²) + masks/ + rects.json
$PY pipeline/build_char.py                   # -> Moving_Characters-boy.glb (30 nodes, no materials)
$PY pipeline/validate.py  <glb>              # names / flatness / pivots / composition / UV
$PY pipeline/uvcheck.py   <glb> atlas.png    # every node must sample painted pixels, not paper
$PY pipeline/render.py    <glb> out.png      # six review renders, one per node group
$PY pipeline/closeup2.py                     # front + ¾ head close-ups
```

Then compress with `tools/compress.mjs` (Draco, quantize 14/10/12) and ship with the
atlas converted to webp.

`build_char.py` needs a headless Blender runtime; the bootstrap used here is the `bpy`
wheel plus `LD_PRELOAD` stubs for the GL/X libraries a headless box lacks.

## Why the layout is code

`layout.py` is a joint table in **world units of the visible silhouette** (not of the
painted rect), so proportions can be tuned in one place. Chibi proportions match
`renders/character-sheet.png`: the head+hair is about half the figure and the cast
stands on a stick running down to `y = -1.40`.

## Gotchas that cost real time (kept so they are not repeated)

* **UV v is flipped exactly once.** The site samples the atlas with `flipY = false`,
  so the file's v must grow downward from the top row. Blender UVs are bottom-up and
  `export_scene.gltf` flips v on the way out, so `mesh.py` solves for the file value
  first and negates it once. A second flip (in the renderer, or "fixing" it by hand)
  sends every part to the wrong rectangle and looks like a broken atlas.
* **Scale changes invalidate UVs.** `new()` scales a part's mesh after `mesh.py`
  baked UVs, and re-origins it around a joint pivot. UVs are captured before the
  transform and restored afterwards; recomputing them from final coordinates drifts.
* **glTF z = −blender_y.** Draw order is expressed as `zorder` and negated on the way
  in, so "bigger zorder = nearer the camera" is true in the GLB too. (Getting this
  wrong puts the hair in front of the face.)
* **Blender flat art must be built in the XZ plane with thickness on Y**, otherwise
  the figure lies down after the Y-up conversion.
* **Painted rects must not overlap** — each part's silhouette is traced from its own
  rect, so an overlap grows a second prong on the limb.
* **`validate.py` is the contract test**, `uvcheck.py` is the "did the atlas actually
  land on the mesh" test. Both must pass on the *decoded* shipped file, not just on
  the exported one.
