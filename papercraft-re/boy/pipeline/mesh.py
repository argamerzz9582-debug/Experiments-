"""Silhouette -> extruded paper-cut mesh, with atlas UVs.

For each part: read its alpha mask, simplify the contour (Douglas-Peucker via
OpenCV-free marching + RDP), extrude to give the paper thickness, and assign UVs
that map the rect back onto the same pixels it was painted from.

Run inside Blender (bpy) — needs bpy.data.meshes.
"""
import json, math
import numpy as np
from PIL import Image

import bpy
import bmesh
from mathutils import Vector

ATLAS_W = ATLAS_H = 2048
ATLAS = '/tmp/gen/atlas.png'
RECTS = json.load(open('/tmp/gen/rects.json'))
MASK = '/tmp/gen/masks/%s.png'

PAPER_T = 0.0016      # thickness of the paper in world units (~2 mm at our scale)
TARGET_H = 2.30       # character height in world units, matching the original


def load_mask(name):
    im = Image.open(MASK % name).convert('L')
    return np.asarray(im) > 30


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    def perp(p, a, b):
        if np.allclose(a, b):
            return np.linalg.norm(p - a)
        return abs(np.cross(b - a, p - a)) / np.linalg.norm(b - a)
    d = np.array([perp(p, pts[0], pts[-1]) for p in pts])
    i = int(np.argmax(d))
    if d[i] > eps:
        left = rdp(pts[:i+1], eps)
        right = rdp(pts[i:], eps)
        return np.vstack([left[:-1], right])
    return np.array([pts[0], pts[-1]])


def label_blobs(mask):
    """Connected opaque regions (4-neighbour BFS), largest first."""
    from collections import deque
    H, W = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        q = deque([(sy, sx)]); seen[sy, sx] = True
        px = []
        while q:
            y, x = q.popleft(); px.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        if len(px) < 90:
            continue
        m = np.zeros_like(mask)
        yy = np.array([p[0] for p in px]); xx = np.array([p[1] for p in px])
        m[yy, xx] = True
        out.append((len(px), m))
    out.sort(key=lambda t: -t[0])
    return [m for _, m in out]


def resample(ring, max_pts=200):
    """Uniform-ish resampling so the point budget is spent evenly around a ring."""
    pts = np.asarray(ring, dtype=np.float64)
    if len(pts) < 4:
        return None
    seg = np.linalg.norm(np.diff(np.vstack([pts, pts[:1]]), axis=0), axis=1)
    total = seg.sum()
    if total <= 0:
        return None
    cum = np.concatenate([[0], np.cumsum(seg)])
    keep = max(8, min(max_pts, max(8, len(pts) // 6)))
    out = []
    for t in np.linspace(0, total, keep, endpoint=False):
        i = int(np.searchsorted(cum, t, side='right') - 1)
        i = min(i, len(pts) - 1)
        f = (t - cum[i]) / max(seg[i], 1e-9)
        out.append(pts[i] * (1 - f) + pts[(i + 1) % len(pts)] * f)
    return np.array(out)


def trace_rings(mask, max_pts=200):
    """All contours (outer + holes) via OpenCV, largest first.

    Returns [(ring_xy, is_hole)] where ring points are (x, y) in mask pixels.
    """
    import cv2
    m = (mask.astype('uint8') * 255)
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return []
    out = []
    for c, h in zip(cs, hier[0]):
        if cv2.contourArea(c) < 60:
            continue
        pts = c.reshape(-1, 2).astype(np.float64)         # (x, y)
        r = resample(pts, max_pts)
        if r is None:
            continue
        out.append((r, int(h[3]) >= 0, float(cv2.contourArea(c))))
    out.sort(key=lambda t: -t[2])
    return [(r, hole) for r, hole, _ in out]


def label_blobs(mask):
    """Connected opaque regions (4-neighbour BFS), largest first."""
    from collections import deque
    H, W = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if seen[sy, sx]:
            continue
        q = deque([(sy, sx)]); seen[sy, sx] = True
        px = []
        while q:
            y, x = q.popleft(); px.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        if len(px) < 90:
            continue
        m = np.zeros_like(mask)
        yy = np.array([p[0] for p in px]); xx = np.array([p[1] for p in px])
        m[yy, xx] = True
        out.append((len(px), m))
    out.sort(key=lambda t: -t[0])
    return [m for _, m in out]


def find_holes(mask):
    """Transparent regions fully enclosed by the shape (4-neighbour flood from the border)."""
    from collections import deque
    H, W = mask.shape
    out = ~mask
    reach = np.zeros_like(mask, dtype=bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if out[y, x] and not reach[y, x]:
                reach[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if out[y, x] and not reach[y, x]:
                reach[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and out[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True; q.append((ny, nx))
    holes = out & ~reach
    return [m for m in label_blobs(holes) if m.sum() > 400]


def make_rings(name, target_h):
    """All contour rings of a part, in portrait units at one shared scale.

    Returns [(ring, is_hole)] with the outer ring first. Extra rings are what
    lets a flat cut-out have a real hole - the hood opening on the robe, say.
    """
    mask = load_mask(name)
    x0, y0, x1, y1 = RECTS[name]
    rw, rh = x1 - x0, y1 - y0
    scale = (rw / rh) * target_h
    found = trace_rings(mask)
    if not found:
        raise SystemExit('no silhouette for %s' % name)
    out = []
    for ring, hole in found:
        px = (ring[:, 0] / rw - 0.5) * scale
        py = (1.0 - ring[:, 1] / rh) * target_h
        out.append((np.stack([px, py], 1), hole))
    allx = np.concatenate([r[:, 0] for r, _ in out])
    shift = (allx.max() + allx.min()) / 2
    return [((r - np.array([shift, 0.0])), hole) for r, hole in out]


def make_part(name, target_h, anchor='bottom', extra=None):
    """Build one extruded paper mesh from the painted silhouette(s)."""
    rings = make_rings(name, target_h)
    x0, y0, x1, y1 = RECTS[name]
    rw, rh = x1 - x0, y1 - y0
    zs = [0.0, PAPER_T]
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    # Flat art lives in the XZ plane with thickness along Y, so that after the
    # glTF Y-up conversion the paper stands up and faces the camera:
    #   blender (x, y, z) -> gltf (x, z, -y)
    front, back = [], []
    for r, hole in rings:
        f = [bm.verts.new((r[i, 0], zs[0], r[i, 1])) for i in range(len(r))]
        b = [bm.verts.new((r[i, 0], zs[1], r[i, 1])) for i in range(len(r))]
        front.append(f); back.append(b)
    bm.verts.ensure_lookup_table()
    for idx, (r, hole) in enumerate(rings):
        n = len(r)
        if not hole:                       # a hole must stay open, so no caps
            bm.faces.new(front[idx][::-1])
            bm.faces.new(back[idx])
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((front[idx][i], front[idx][j], back[idx][j], back[idx][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()

    # UVs: every vertex maps to the pixel it was painted from.
    # The site samples this atlas with flipY = false, so in the FILE v must run
    # downward from the top of the image: the top of a shape (z = h) is the row
    # the artist painted it at (ay0), the bottom (z = 0) is the row below (ay1).
    # Blender stores UVs bottom-up and the glTF exporter flips v on the way out,
    # so the file value is solved for first and then negated once here - getting
    # this wrong shifts every part onto its neighbour's rectangle.
    uv_layer = me.uv_layers.new(name='UVMap')
    ax0, ay0 = x0 / ATLAS_W, y0 / ATLAS_H
    aw, ah = rw / ATLAS_W, rh / ATLAS_H
    scale = (rw / rh) * target_h
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uu = (co.x / scale) + 0.5
            v_file = ay0 + (1.0 - co.z / target_h) * ah
            uv_layer.data[li].uv = (ax0 + uu * aw, 1.0 - v_file)

    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob
