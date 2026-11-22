"""Boy hairstyle: shorten only the long back-hair mass (and side strands).

Identified by rendering every connected piece with distinct colours:
  Winter front: piece 7 = long back hair, 6 = fringe, 8 = face, 4/5 = strands.
We compress the long hair vertically about its TOP edge (geometry only - its
UVs sample a flat brown paper region, so no re-unwrap or texture work needed),
and shorten the thin side strands the same way.
"""
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, '/tmp')
from raster import load, sample_bilinear, render
from boyify import components, is_brown, is_skin

TEX = np.array(Image.open('/tmp/pc/public/textures/Moving_Characters_1.webp').convert('RGB'))


def piece_info(m):
    out = []
    for v in components(m):
        if len(v) < 6:
            continue
        p = m['pos'][v]
        c = sample_bilinear(TEX, m['uv'][v, 0], m['uv'][v, 1]).mean(0) if m['uv'] is not None else np.zeros(3)
        out.append(dict(v=v, n=len(v), c=c,
                        x0=float(p[:,0].min()), x1=float(p[:,0].max()),
                        y0=float(p[:,1].min()), y1=float(p[:,1].max())))
    return out


def face_piece(info):
    cand = [p for p in info if is_skin(p['c'])
            and (p['x1']-p['x0']) > 0.30 and (p['y1']-p['y0']) > 0.25]
    return max(cand, key=lambda p: p['n']) if cand else None


def hair_pieces(info, face):
    """Long hair = brown piece starting above the jaw, ending well below it,
    and comparable in width to the face. Side strands = thin brown slivers
    also crossing the jaw line."""
    fh = face['y1'] - face['y0']
    fw = face['x1'] - face['x0']
    jaw = face['y0'] + 0.10 * fh
    out = []
    for p in info:
        if p is face or not is_brown(p['c']):
            continue
        w = p['x1'] - p['x0']; h = p['y1'] - p['y0']
        if p['y1'] <= jaw:          # does not reach below the jaw
            continue
        if w > 0.45 * fw or (h > 0.30 * fh and w > 0.02):
            out.append(p)
    return out


def shorten(m, pieces, face, frac=0.30, taper=0.45):
    """Compress each piece vertically about its own top edge."""
    P = m['pos'].copy()
    fh = face['y1'] - face['y0']
    cutoff = face['y0'] + frac * fh
    cx = 0.5 * (face['x0'] + face['x1'])
    moved = 0
    for p in pieces:
        v = p['v']
        span = p['y1'] - p['y0']
        if span < 1e-6:
            continue
        s = (p['y1'] - cutoff) / span
        s = max(min(s, 1.0), 0.05)
        y = P[v, 1]
        newy = p['y1'] + (y - p['y1']) * s
        t = np.clip((p['y1'] - newy) / max(span * s, 1e-6), 0, 1)
        x = P[v, 0]
        P[v, 0] = cx + (x - cx) * (1.0 - taper * t ** 2)
        P[v, 1] = newy
        moved += len(v)
    out = dict(m); out['pos'] = P
    return out, moved, cutoff


def boyify_mesh(m, face):
    if face is None:
        return m, 0, None
    info = piece_info(m)
    hp = hair_pieces(info, face)
    if not hp:
        return m, 0, None
    return shorten(m, hp, face, frac=0.30)


if __name__ == '__main__':
    ms = load()
    g = [m for m in ms if m['name'] in ('Moving_Characters_Winter_head_front',
                                        'Moving_Characters_Winter_front_character',
                                        'Moving_Characters_Winter_happy_face',
                                        'Moving_Characters_Winter_front_smile_face')]
    head = [m for m in g if m['name'] == 'Moving_Characters_Winter_head_front'][0]
    face = face_piece(piece_info(head))
    print('face', face['x0'], face['x1'], face['y0'], face['y1'])
    res = []
    for m in g:
        mm, mv, cut = boyify_mesh(m, face)
        print(f'  {m["name"]:44} moved={mv:4} cutoff={cut}')
        res.append(mm)
    a = render(g, size=600); b = render(res, size=600)
    c = Image.new('RGB', (1200, 600), 'white'); c.paste(a, (0, 0)); c.paste(b, (600, 0))
    c.save('/tmp/b_affine.png')
