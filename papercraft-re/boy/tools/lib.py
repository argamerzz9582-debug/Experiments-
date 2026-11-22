"""Self-contained helpers: GLB I/O, piece segmentation, texture sampling, rasterizer."""
import json, struct, sys
import numpy as np
from PIL import Image

sys.path.insert(0, '/tmp/re')
from glbtool import meshes_world, write_acc, save, load as glb_load  # noqa

ATLAS = '/tmp/up/public/textures/Moving_Characters_1.webp'
_TEX = None
def tex():
    global _TEX
    if _TEX is None:
        _TEX = np.array(Image.open(ATLAS).convert('RGB'))
    return _TEX


# ---------- segmentation ----------
def components(m):
    n = len(m['pos']); parent = list(range(n))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for t in m['idx']:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[0], t[2])):
            ra, rb = find(a), find(b)
            if ra != rb: parent[rb] = ra
    g = {}
    for i in range(n):
        g.setdefault(find(i), []).append(i)
    return [np.array(v) for v in g.values()]


def sample(u, v):
    """Bilinear sample with flipY=false, repeat wrap (matches the site material)."""
    T = tex(); H, W = T.shape[:2]
    x = (u % 1.0) * (W - 1)
    y = (v % 1.0) * (H - 1)
    x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64)
    x1 = np.clip(x0 + 1, 0, W - 1); y1 = np.clip(y0 + 1, 0, H - 1)
    x0 = np.clip(x0, 0, W - 1); y0 = np.clip(y0, 0, H - 1)
    fx = (x - x0)[:, None]; fy = (y - y0)[:, None]
    return (T[y0, x0] * (1-fx) * (1-fy) + T[y0, x1] * fx * (1-fy)
            + T[y1, x0] * (1-fx) * fy + T[y1, x1] * fx * fy).astype(np.float64)


def pieces(m, min_verts=6):
    out = []
    for v in components(m):
        if len(v) < min_verts: continue
        p = m['pos'][v]
        c = sample(m['uv'][v, 0], m['uv'][v, 1]).mean(0) if m['uv'] is not None else np.zeros(3)
        out.append(dict(v=v, n=len(v), c=c,
                        x0=float(p[:,0].min()), x1=float(p[:,0].max()),
                        y0=float(p[:,1].min()), y1=float(p[:,1].max())))
    return out


def is_skin(c):
    r, g, b = c
    return r > 165 and g > 128 and b > 115 and (r - g) > 12 and (g - b) >= -6


def is_brown(c):
    r, g, b = c
    return 70 < r < 168 and 28 < g < 110 and 28 < b < 110 and (r - g) > 14 and abs(g - b) < 26


# ---------- rasterizer (front ortho view, z-buffered) ----------
def render(meshes, size=800, margin=0.08, bg=(255,255,255)):
    T = tex()
    allp = np.concatenate([m['pos'] for m in meshes])
    mn = allp[:, :2].min(0); mx = allp[:, :2].max(0)
    scale = (1 - 2*margin) * size / (mx - mn).max()
    cx, cy = (mn + mx) / 2
    img = np.zeros((size, size, 3), np.float64); img[:] = bg
    zb = np.full((size, size), -1e9, np.float32)
    for m in meshes:
        if m['uv'] is None: continue
        P, U = m['pos'], m['uv']
        sx = (P[:,0]-cx)*scale + size/2
        sy = size/2 - (P[:,1]-cy)*scale
        for t in m['idx']:
            x0,x1,x2 = sx[t[0]],sx[t[1]],sx[t[2]]
            y0,y1,y2 = sy[t[0]],sy[t[1]],sy[t[2]]
            area = (x1-x0)*(y2-y0) - (x2-x0)*(y1-y0)
            if abs(area) < 1e-9: continue
            xmin=max(int(np.floor(min(x0,x1,x2))),0); xmax=min(int(np.ceil(max(x0,x1,x2))),size-1)
            ymin=max(int(np.floor(min(y0,y1,y2))),0); ymax=min(int(np.ceil(max(y0,y1,y2))),size-1)
            if xmin>xmax or ymin>ymax: continue
            gx,gy = np.meshgrid(np.arange(xmin,xmax+1)+0.5, np.arange(ymin,ymax+1)+0.5)
            w0=((x1-gx)*(y2-gy)-(x2-gx)*(y1-gy))/area
            w1=((x2-gx)*(y0-gy)-(x0-gx)*(y2-gy))/area
            w2=1-w0-w1
            ins=(w0>=-1e-6)&(w1>=-1e-6)&(w2>=-1e-6)
            if not ins.any(): continue
            z = w0*P[t[0],2]+w1*P[t[1],2]+w2*P[t[2],2]
            sub = zb[ymin:ymax+1, xmin:xmax+1]
            w = ins & (z > sub)
            if not w.any(): continue
            idxs = np.nonzero(w)
            u = w0[idxs]*U[t[0],0]+w1[idxs]*U[t[1],0]+w2[idxs]*U[t[2],0]
            v = w0[idxs]*U[t[0],1]+w1[idxs]*U[t[1],1]+w2[idxs]*U[t[2],1]
            img[ymin:ymax+1, xmin:xmax+1][idxs] = sample(u, v)
            sub[idxs] = z[idxs]
    return Image.fromarray(np.clip(img,0,255).astype(np.uint8))


def load_meshes(path):
    js, bin_, prims = meshes_world(path)
    return js, bin_, [dict(name=p['name'], pos=p['pos'], uv=p['uv'], idx=p['idx']) for p in prims], prims
