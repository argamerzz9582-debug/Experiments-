"""Boy transform v4 - bbox-aware.

Discriminator: face features (mouth, brows) are brown pieces that sit INSIDE the
face bounding box. Hair is brown and extends BEYOND it (wider than the face, or
above the crown). Only pieces that reach below the jaw are shortened.
"""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/tmp')
from raster import load, render
from boy2 import piece_info, face_piece, is_brown


def inside(px, fb, m=0.02):
    return (px['x0'] >= fb['x0'] - m and px['x1'] <= fb['x1'] + m
            and px['y0'] >= fb['y0'] - m and px['y1'] <= fb['y1'] + m)


def plan(m, face, drop_strands=True):
    fh = face['y1'] - face['y0']; fw = face['x1'] - face['x0']
    jaw = face['y0'] + 0.08 * fh
    hair, strands = [], []
    for p in piece_info(m):
        if not is_brown(p['c']):
            continue
        if inside(p, face):
            continue                       # mouth / brow / blush - leave alone
        if p['y1'] <= jaw:
            continue                       # not hanging below the jaw
        w = p['x1'] - p['x0']; h = p['y1'] - p['y0']
        # does it extend past the face horizontally, or sit above the crown?
        wide = (p['x1'] > face['x1'] + 0.02) or (p['x0'] < face['x0'] - 0.02)
        above = p['y0'] < face['y0'] - 0.05 * fh
        if not (wide or above):
            continue
        if drop_strands and w < 0.12 * fw and h > 0.12 * fh:
            strands.append(p)              # thin wisp -> delete
        else:
            hair.append(p)
    return hair, (strands if drop_strands else [])


def apply(m, face, frac=0.32, taper=0.45, drop_strands=True):
    if face is None:
        return m, 0, 0
    hair, strands = plan(m, face, drop_strands)
    fh = face['y1'] - face['y0']
    cutoff = face['y0'] + frac * fh
    cx = 0.5 * (face['x0'] + face['x1'])
    P = m['pos'].copy()
    moved = 0
    for p in hair:
        v = p['v']; span = p['y1'] - p['y0']
        if span < 1e-6:
            continue
        s = max(min((p['y1'] - cutoff) / span, 1.0), 0.05)
        y = P[v, 1]
        newy = p['y1'] + (y - p['y1']) * s
        t = np.clip((p['y1'] - newy) / max(span * s, 1e-6), 0, 1)
        x = P[v, 0]
        P[v, 0] = cx + (x - cx) * (1.0 - taper * t ** 2)
        P[v, 1] = newy
        moved += len(v)

    dead = set()
    for p in strands:
        dead.update(int(i) for i in p['v'])
    idx = m['idx']
    before = len(idx)
    if dead:
        idx = np.array([t for t in m['idx'] if not (t[0] in dead or t[1] in dead or t[2] in dead)],
                       dtype=np.int64).reshape(-1, 3)
    out = dict(m); out['pos'] = P; out['idx'] = idx
    return out, moved, before - len(idx)


GROUPS = {
    'winter_front': ['Moving_Characters_Winter_head_front', 'Moving_Characters_Winter_front_character',
                     'Moving_Characters_Winter_happy_face', 'Moving_Characters_Winter_front_smile_face'],
    'winter_side': ['Moving_Characters_Winter_side', 'Moving_Characters_Winter_side_face'],
    'spring_front': ['Moving_Characters_Spring_front'],
    'spring_side': ['Moving_Characters_Spring_side', 'Moving_Characters_Spring_side_face'],
    'summer': ['Moving_Characters_Summer_character', 'Moving_Characters_Summer_happy_face'],
    'fall': ['Moving_Characters_Fall_character', 'Moving_Characters_Fall_face'],
}


def group_face(ms, key):
    best = None
    for m in [x for x in ms if x['name'] in GROUPS[key]]:
        f = face_piece(piece_info(m))
        if f and (best is None or f['n'] > best['n']):
            best = f
    return best


def boyify_all(ms):
    res = {}
    for key in GROUPS:
        face = group_face(ms, key)
        orig = [m for m in ms if m['name'] in GROUPS[key]]
        new = []
        for m in orig:
            mm, mv, nt = apply(m, face)
            if mv or nt:
                print(f'  {key:13} {m["name"][:40]:40} moved={mv:4} dropped_tris={nt:4}')
            new.append(mm)
        res[key] = (orig, new, face)
    return res


if __name__ == '__main__':
    ms = load()
    r = boyify_all(ms)
    tiles = [(render(o, size=440), render(n, size=440)) for o, n, _ in r.values()]
    cmb = Image.new('RGB', (len(tiles) * 880, 450), 'white')
    for i, (a, b) in enumerate(tiles):
        cmb.paste(a, (i * 880, 5)); cmb.paste(b, (i * 880 + 440, 5))
    cmb.save('/tmp/b_v4.png'); print('ok')
