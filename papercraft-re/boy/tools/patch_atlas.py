"""Erase the girl's hairpin from the atlas.

The black hairpin that reads as a headband in the Fall view is not geometry -
it is painted into Moving_Characters_1.webp. Only one mesh samples that region
(the Fall hair patch), so the texels can be repainted without touching any
other season. Each masked row is filled by interpolating horizontally between
the nearest clean texels, which keeps the brown/black paper edge next to it,
then a little grain from a clean hair patch is added back.
"""
import sys
sys.path.insert(0, '/tmp/re')
import numpy as np
from PIL import Image
import lib

PIN = (1207, 1403, 1028, 1104)      # x0,x1,y0,y1 of the hairpin in atlas px


def main(src, dst):
    T = np.asarray(Image.open(src).convert('RGB')).astype(np.float64)
    H, W = T.shape[:2]
    reg = np.zeros((H, W), bool)
    reg[PIN[2]:PIN[3], PIN[0]:PIN[1]] = True
    out = T.copy()
    for y in range(PIN[2], PIN[3]):
        xs = np.nonzero(reg[y])[0]
        clean = np.nonzero(~reg[y])[0]
        left = clean[clean < xs.min()]; right = clean[clean > xs.max()]
        if not len(left) or not len(right):
            continue
        l, r = left[-1], right[0]
        t = (xs - l) / max(r - l, 1)
        out[y, xs] = T[y, l][None, :] * (1 - t)[:, None] + T[y, r][None, :] * t[:, None]
    grain = T[960:1000, 1240:1440]
    grain = grain - grain.mean((0, 1), keepdims=True)
    rng = np.random.default_rng(5)
    ys, xs = np.nonzero(reg)
    g = grain.reshape(-1, 3)[rng.integers(0, grain.reshape(-1, 3).shape[0], len(ys))]
    out[ys, xs] += g * 0.75
    np.clip(out, 0, 255, out)
    Image.fromarray(out.astype(np.uint8)).save(dst, quality=92, method=6)
    print('wrote', dst)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/up/public/textures/Moving_Characters_1.webp',
         sys.argv[2] if len(sys.argv) > 2 else '/tmp/work/tex_fixed.webp')
