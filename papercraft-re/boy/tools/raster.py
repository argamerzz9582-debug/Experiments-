"""Tiny software rasterizer for the papercraft character.

Flat paper-cutout meshes -> orthographic projection -> z-buffer -> textured
sample from the 2048^2 atlas. Gives a headless render-verify loop without
Blender (apt/GL libs are unavailable in this sandbox).
"""
import json
import numpy as np
from PIL import Image

ATLAS = "/tmp/up/public/textures/Moving_Characters_1.webp"
GEO = "/tmp/mc_geo.json"


def load():
    g = json.load(open(GEO))
    meshes = []
    for m in g["meshes"]:
        pos = np.array(m["pos"], dtype=np.float32).reshape(-1, 3)
        uv = np.array(m["uv"], dtype=np.float32).reshape(-1, 2) if m["uv"] else None
        if m["idx"]:
            idx = np.array(m["idx"], dtype=np.int64).reshape(-1, 3)
        else:
            idx = np.arange(len(pos), dtype=np.int64).reshape(-1, 3)
        meshes.append({"name": m["name"], "pos": pos, "uv": uv, "idx": idx})
    return meshes


def sample_bilinear(tex, u, v):
    """u,v in [0,1) with repeat wrap. tex: (H,W,3) uint8."""
    H, W = tex.shape[:2]
    x = (u % 1.0) * (W - 1)
    y = (v % 1.0) * (H - 1)   # flipY=false per ktxLoader.jsx
    x0 = np.floor(x).astype(np.int64)
    y0 = np.floor(y).astype(np.int64)
    x1 = np.clip(x0 + 1, 0, W - 1)
    y1 = np.clip(y0 + 1, 0, H - 1)
    x0 = np.clip(x0, 0, W - 1)
    y0 = np.clip(y0, 0, H - 1)
    fx = (x - x0)[:, None]
    fy = (y - y0)[:, None]
    c00 = tex[y0, x0].astype(np.float32)
    c10 = tex[y0, x1].astype(np.float32)
    c01 = tex[y1, x0].astype(np.float32)
    c11 = tex[y1, x1].astype(np.float32)
    return (c00 * (1 - fx) * (1 - fy) + c10 * fx * (1 - fy)
            + c01 * (1 - fx) * fy + c11 * fx * fy)


def render(meshes, size=800, margin=0.08, cast_shadow=True, bg=(255, 255, 255)):
    tex = np.array(Image.open(ATLAS).convert("RGB"))

    # world bounds over all verts (front view = XY)
    allp = np.concatenate([m["pos"] for m in meshes])
    mn = allp[:, :2].min(axis=0)
    mx = allp[:, :2].max(axis=0)
    span = (mx - mn)
    scale = (1.0 - 2 * margin) * size / span.max()
    cx, cy = (mn + mx) / 2

    img = np.zeros((size, size, 3), dtype=np.float32)
    img[:] = bg
    zbuf = np.full((size, size), -1e9, dtype=np.float32)

    # painter order: draw by increasing z so nearer wins via z-buffer
    for m in meshes:
        if m["uv"] is None:
            continue
        P = m["pos"]
        U = m["uv"]
        # screen coords
        sx = (P[:, 0] - cx) * scale + size / 2
        sy = size / 2 - (P[:, 1] - cy) * scale
        sz = P[:, 2]

        tri = m["idx"]
        for t in tri:
            x0, x1, x2 = sx[t[0]], sx[t[1]], sx[t[2]]
            y0, y1, y2 = sy[t[0]], sy[t[1]], sy[t[2]]
            area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
            if abs(area) < 1e-9:
                continue
            xmin = max(int(np.floor(min(x0, x1, x2))), 0)
            xmax = min(int(np.ceil(max(x0, x1, x2))), size - 1)
            ymin = max(int(np.floor(min(y0, y1, y2))), 0)
            ymax = min(int(np.ceil(max(y0, y1, y2))), size - 1)
            if xmin > xmax or ymin > ymax:
                continue
            xs = np.arange(xmin, xmax + 1) + 0.5
            ys = np.arange(ymin, ymax + 1) + 0.5
            gx, gy = np.meshgrid(xs, ys)

            w0 = ((x1 - gx) * (y2 - gy) - (x2 - gx) * (y1 - gy)) / area
            w1 = ((x2 - gx) * (y0 - gy) - (x0 - gx) * (y2 - gy)) / area
            w2 = 1.0 - w0 - w1
            inside = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
            if not inside.any():
                continue

            z = w0 * sz[t[0]] + w1 * sz[t[1]] + w2 * sz[t[2]]
            u = w0 * U[t[0], 0] + w1 * U[t[1], 0] + w2 * U[t[2], 0]
            v = w0 * U[t[0], 1] + w1 * U[t[1], 1] + w2 * U[t[2], 1]

            sub = zbuf[ymin:ymax + 1, xmin:xmax + 1]
            write = inside & (z > sub)
            if not write.any():
                continue
            idxs = np.nonzero(write)
            cols = sample_bilinear(tex, u[idxs], v[idxs])
            img[ymin:ymax + 1, xmin:xmax + 1][idxs] = cols
            sub[idxs] = z[idxs]

    out = np.clip(img, 0, 255).astype(np.uint8)
    return Image.fromarray(out)


if __name__ == "__main__":
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else "Moving_Characters_Winter_front_character"
    groups = {
        "winter_front": ["Moving_Characters_Winter_front_character",
                         "Moving_Characters_Winter_head_front",
                         "Moving_Characters_Winter_happy_face",
                         "Moving_Characters_Winter_front_smile_face",
                         "Moving_Characters_Winter_Front_Smile",
                         "Moving_Characters_Winter_front_smile"],
        "winter_side": ["Moving_Characters_Winter_side",
                        "Moving_Characters_Winter_side_face",
                        "Moving_Characters_Winter_side_face_smile"],
        "summer": ["Moving_Characters_Summer_character"],
        "fall": ["Moving_Characters_Fall_character"],
        "spring": ["Moving_Characters_Spring_front"],
    }
    ms = load()
    if which in groups:
        ms = [m for m in ms if m["name"] in groups[which]]
    else:
        ms = [m for m in ms if which in m["name"]]
    print("rendering", len(ms), "meshes:", [m["name"] for m in ms])
    im = render(ms, size=800)
    out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/render.png"
    im.save(out)
    print("wrote", out, im.size)
