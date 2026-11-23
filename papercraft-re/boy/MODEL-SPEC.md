# Character model — spec for an externally-authored replacement

> **Short version (Hinglish):** Website `Moving_Characters-transformed.glb` ko load karti hai
> aur uske **30 fixed node names** ko by-name pakadti hai. Agar bahar se naya model aata hai to
> (1) wahi 30 names exactly chahiye, (2) ek hi atlas texture, (3) `.glb` export, (4) 6 nodes
> ka pivot sahi jagah — warna animation galat ghoomega. Baaki geometry/texture kuch bhi ho sakta
> hai. Neeche poora detail hai.

---

## 0. Scope decision (agreed) — one character, four poses

An externally-built replacement is for the **whole cast**, and it is **one boy character
repeated in four seasonal outfits**, not four different people.

That is a simplification, and it is the reason a hand-built model can look better than what we
have now:

* **One face, one head drawing, one hairstyle** across all four seasons. Today they are four
  different head meshes re-cut from a girl model, which is exactly why they read inconsistently.
  The head can be the *same geometry and the same UV island* duplicated into each pose — cheaper
  to draw and instantly consistent.
* Only three things change per season: **outfit, pose, prop**.

| Season | Outfit | Pose | Prop / set piece | Animated parts |
|---|---|---|---|---|
| Winter (front) | coat, scarf, beanie | standing, arms slightly out, feet apart | — | arms + feet swing (±0.7 rad) |
| Winter (side) | same coat/beanie, profile | same standing pose seen from the side | — | same arms/feet |
| Spring (front) | tunic | standing | — | — |
| Spring (side) | same tunic | seated, riding | bicycle with **two separate wheels** | both wheels spin continuously |
| Summer | shorts, no sleeves | crouched on board | surfboard + water wave strip | — |
| Fall | long robe | standing on a branch | crane in flight + staff | — |

Practical constraints that follow from the table:

* The **Winter pose must be near-neutral** — the arms and feet rotate ±40° every frame, so the
  arms need clearance and must pivot at the shoulder/hip (§3). Don't bake a dramatic pose there.
* The **two bike wheels must be separate nodes** with the axle at the pivot, or the spin will
  wobble.
* Reuse the same head drawing in all four poses and the atlas gets smaller, not bigger: you paint
  the head, hands and hair **once**.

Reference sheet for the artist: `renders/character-sheet.png` (same boy, four outfits/poses,
flat papercut look — target silhouette and proportions, not a final render).

---

## 1. How the site actually uses the file

`src/Experience/models/Moving_Characters.jsx` (`public/models/Moving_Characters-transformed.glb`):

| Fact | Value |
|---|---|
| Animations baked in the GLB | **none** (`animations: []`) — all motion is JS |
| Materials in the GLB | **none** — the site applies one material to every mesh |
| Texture | **not inside the GLB**. Loaded separately from `/textures/Moving_Characters_1.webp`, `flipY = false`, `MeshBasicMaterial`, `side: DoubleSide` |
| Mesh count | 30 nodes, 30 meshes, 1 primitive each, `mode: 4` (triangles) |
| Attributes | `POSITION`, `NORMAL`, `TEXCOORD_0`, `indices` |
| Extensions | `KHR_draco_mesh_compression` (we add this ourselves — you don't need to) |
| Totals today | 24,773 verts / 39,670 tris |

**Why this matters:** because there are no materials, **all colour comes from the UV atlas**.
A new model must be UV-unwrapped into one texture sheet. Vertex paint, per-object materials,
or embedded textures will not survive — they simply aren't read.

The look is deliberately *flat paper cut-outs*: no lighting, no shading, no normals used. So the
quality comes from the **drawing/painting** of the texture and the **silhouette** of the mesh,
not from 3D modelling detail. This is the core thing a replacement has to get right — the current
model looks weak because the silhouette was re-cut from a girl model, not drawn as a boy.

---

## 2. The 30 node names (do not rename)

The site looks each one up by name. A missing name = the part does not render.
Each name must be on the **node** (not just the mesh).

```
Moving_Characters_Winter_arm_left_front       Moving_Characters_Spring_side
Moving_Characters_Winter_arm_right_front      Moving_Characters_Spring_side_back_wheel
Moving_Characters_Winter_front_smile          Moving_Characters_Spring_side_face
Moving_Characters_Winter_front_character      Moving_Characters_Spring_side_face_smile
Moving_Characters_Winter_Front_Smile          Moving_Characters_Spring_side_front_wheel
Moving_Characters_Winter_front_smile_face     Moving_Characters_Fall_character
Moving_Characters_Winter_happy_face           Moving_Characters_Fall_face
Moving_Characters_Winter_head_front           Moving_Characters_Fall_left_arm
Moving_Characters_Winter_left_arm             Moving_Characters_Fall_right_arm
Moving_Characters_Winter_left_foot            Moving_Characters_Summer_character
Moving_Characters_Winter_right_arm            Moving_Characters_Summer_character_Wave
Moving_Characters_Winter_right_foot           Moving_Characters_Summer_happy_face
Moving_Characters_Winter_side                 Moving_Characters_Summer_left_arm
Moving_Characters_Winter_side_face            Moving_Characters_Summer_right_arm
Moving_Characters_Winter_side_face_smile      Moving_Characters_Spring_front
```

### What each group is
A "character" is assembled from several overlapping pieces (body, head, face overlay, arms,
feet) that all sit at the same place. The four seasons are four different characters; Winter has
both a **front** and a **side** version which swap as you scroll.

| Season | Pieces you must supply |
|---|---|
| Winter **front** | `Winter_head_front` (head+hair+hat), `Winter_front_character` (body), `Winter_front_smile_face` + `Winter_happy_face` (face overlays), `Winter_Front_Smile` + `Winter_front_smile` (mouth, 2 tiny pieces), `Winter_arm_left_front``, `Winter_arm_right_front` (raised arms) |
| Winter **side** | `Winter_side` (body+hair+hat in profile), `Winter_side_face`, `Winter_side_face_smile` |
| Winter **shared/both** | `Winter_left_arm`, `Winter_right_arm`, `Winter_left_foot`, `Winter_right_foot` — these are the **animated** ones, they stay attached to whichever Winter view is shown |
| Spring **front** | `Spring_front` (single mesh, whole character) |
| Spring **side** (bicycle) | `Spring_side` (character+bike), `Spring_side_face`, `Spring_side_face_smile`, `Spring_side_front_wheel`, `Spring_side_back_wheel` |
| Summer (surfboard) | `Summer_character` (character+board), `Summer_happy_face`, `Summer_character_Wave` (water/wave), `Summer_left_arm`, `Summer_right_arm` |
| Fall (crane) | `Fall_character` (girl+bird+branch), `Fall_face`, `Fall_left_arm`, `Fall_right_arm` |

Faces are **overlays** on top of the head, drawn slightly in front in Z (see the Z ranges in
§5). Keep that separation — the face piece has to sit in front of the head without z-fighting.

---

## 3. The six nodes that are animated — pivots matter

These are rotated in JS every frame around **the node's own translation**. So the mesh must be
authored around the right joint, otherwise the part spins about the wrong place:

| Node | Rotates about | Pivot must be at |
|---|---|---|
| `Winter_left_arm` / `Winter_right_arm` | `rotation.z`, ±`sin` | the **shoulder** |
| `Winter_left_foot` / `Winter_right_foot` | `rotation.z`, ±`sin` | the **hip** |
| `Spring_side_front_wheel` / `Spring_side_back_wheel` | `rotation.z`, scroll-driven | the **axle centre** |

Swing amplitude is 0.7 rad (±40°) for arms/feet and up to ~205 rad for wheels (continuous).
Keep each of those parts a rigid piece — no deformation, they're just rotated.

Note `Spring_side_face` is the only node with a **scale** in the file today; scale is fine for
static nodes but avoid non-uniform scale on the six animated ones.

---

## 4. Export format

* **`.glb`**, binary glTF 2.0. One scene, 30 flat top-level children (the current file has
  exactly 30 scene children, no nesting — please keep it flat; the loader is generated and
  reads `nodes.<name>.geometry` directly).
* **Y-up, metres.** No rotation on the root. The whole cast faces **+Z** (towards camera).
* Authoring units: see §5 ranges — the characters are roughly **2.2 units tall**.
* One mesh per node, one primitive, triangles, no morph targets, no skins.
* **No materials, no embedded textures, no lights, no cameras, no animations.** They are ignored
  and only add weight. (Exported `KHR_materials_*` is harmless but pointless.)
* Draco: leave it off, we compress on our side.

---

## 5. Placement — where things currently sit

These are the world-space bounding boxes of the **current** file, so you can line a new model up
without guessing. All values are `(min, max)` in world units.

| Node | x | y | z |
|---|---|---|---|
| Winter_head_front | -0.46 … 0.49 | 0.89 … 2.23 | 0.09 … 0.19 |
| Winter_front_character | -0.33 … 0.31 | -1.16 … 0.89 | -0.08 … 0.14 |
| Winter_front_smile_face | -0.35 … 0.34 | 1.08 … 1.38 | 0.12 … 0.15 |
| Winter_happy_face | -0.33 … 0.31 | 1.15 … 1.39 | 0.12 … 0.14 |
| Winter_Front_Smile / Winter_front_smile | ±0.07 | 0.98 … 1.01 | 0.12 … 0.14 |
| Winter_arm_left_front | 0.16 … 0.47 | 0.39 … 0.81 | 0.14 … 0.15 |
| Winter_arm_right_front | -0.49 … -0.18 | 0.39 … 0.81 | 0.10 … 0.12 |
| Winter_left_arm / right_arm | -0.20 … 0.03 | 0.58 … 1.11 | 0.03 … 0.08 |
| Winter_left_foot / right_foot | -0.16 … 0.09 | 0.15 … 0.55 | 0.04 … 0.07 |
| Winter_side | -0.55 … 0.23 | -0.96 … 2.26 | -0.06 … 0.08 |
| Winter_side_face | -0.05 … 0.08 | 1.19 … 1.61 | 0.06 … 0.07 |
| Winter_side_face_smile | -0.05 … 0.13 | 1.15 … 1.60 | 0.05 … 0.07 |
| Spring_front | -0.57 … 0.47 | -1.38 … 1.95 | -0.20 … -0.02 |
| Spring_side | -0.73 … 0.81 | -1.35 … 2.03 | -0.16 … 0.13 |
| Spring_side_face | 0.16 … 0.30 | 1.17 … 1.59 | 0.05 … 0.06 |
| Spring_side_face_smile | 0.18 … 0.37 | 1.13 … 1.58 | 0.03 … 0.05 |
| Spring_side_front_wheel | 0.26 … 0.77 | 0.07 … 0.59 | 0.06 … 0.11 |
| Spring_side_back_wheel | -0.63 … -0.11 | 0.05 … 0.57 | -0.03 … 0.03 |
| Summer_character | -0.60 … 0.72 | -1.46 … 2.04 | -0.22 … 0.19 |
| Summer_happy_face | -0.21 … 0.37 | 1.39 … 1.61 | -0.05 … 0.02 |
| Summer_character_Wave | -1.01 … 0.06 | -1.25 … 1.46 | -0.42 … -0.18 |
| Summer_left_arm | 0.18 … 0.42 | 0.83 … 1.11 | -0.07 … -0.04 |
| Summer_right_arm | -0.31 … -0.05 | 0.88 … 1.13 | 0.00 … 0.03 |
| Fall_character | -2.14 … 1.76 | -1.44 … 1.86 | -0.20 … 0.05 |
| Fall_face | -0.38 … 0.30 | 1.04 … 1.45 | -0.05 … -0.02 |
| Fall_left_arm | 0.11 … 0.47 | 0.49 … 0.91 | -0.03 … -0.02 |
| Fall_right_arm | -0.52 … -0.16 | 0.48 … 0.91 | -0.07 … -0.04 |

Two conventions to keep:

* **Pole/stick:** each character stands on a thin stick that runs down to about `y = -1.4`.
  It's part of the character mesh, not a separate node.
* **Z is the drawing stack.** Bigger z = closer to camera. Faces ~+0.12, bodies ~0, side/back
  pieces negative. Ratios don't matter, ordering does.

It is fine for a new model to have different absolute coordinates **as long as every node keeps
the same relative composition** (head above body, arms at the sides, the six animated pivots on
their joints). If you change scale, tell me the new overall height so I adjust one constant.

---

## 6. Texture atlas

* One image, **2048 × 2048**, **webp** (we convert from png; png is fine to hand over).
* `flipY = false` — so glTF UV origin is **top-left** of the image, same as Blender's default
  when it exports without flipping.
* Every triangle's UV must land on painted pixels inside the sheet. Unwrapped islands need a
  few px of padding round them, otherwise the mipmap-less bilinear sampling shows seams.
* Current atlas: `Moving_Characters_1.webp`, 892,954 B (it was 1.12 MB before we erased the old
  girl's painted hairpin).
* Paper texture is baked into the atlas (fibrous noise + a soft drop-shadow on the cut edge).
  Keep that; it's most of what sells the "papercut" look.

---

## 7. Delivery

Drop these into a folder and share it (Dropbox is connected to this workspace, I can pull from a
share link directly):

```
boy-character/
  Moving_Characters.glb          ← the 30 nodes, names from §2
  Moving_Characters_1.png        ← or .webp, the atlas
  character.blend                ← optional but please include if you have it
  preview_front.png              ← optional: front view of all four seasons
```

Please also send the `.blend` if there is one — it makes any future tweak (colour, hairstyle,
one pose) a 5-minute job instead of re-editing exported geometry, which is what we're doing today.

Size guidance: keep the `.glb` under ~5 MB and the atlas under ~3 MB before our compression. The
current whole site payload is ~23 MB, so a heavy model is the one thing that will visibly slow the
scroll.

---

## 8. What I do on this end once the file arrives

1. Validate §2 (all 30 names), §3 (pivots), §5 (composition) and §6 (UV coverage) automatically —
   I already have tooling that renders every piece and every triangle's UV footprint without a
   browser, so mistakes show up as an image before anything ships.
2. Convert the atlas to webp, Draco-compress the GLB, keep node names and TRS intact.
3. Headless-render all six views and diff them against the current ones for review.
4. Ship it: drop into `papercraft-site/public/models/` + `public/textures/`, build, PR, deploy to
   `aimees-papercraft-world-sooty.vercel.app`.

**No site code changes are needed** if §2/§3/§5 are respected. If you want *different* animation
(e.g. a real walk, blinking, a different wave), that is also doable — tell me and I'll scope the
JSX side separately, because today the motion is hardcoded.
