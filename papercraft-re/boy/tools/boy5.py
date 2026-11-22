"""Boy transform v5 - the last two views (Winter side, Fall).

Built on top of the v4 result (four views already converted), not on the
original GLB. Works purely by deleting geometry:
  * Winter side: the long back-hair is five stacked overlay pieces that hang
    past the jaw; deleting all five leaves the short cut that is underneath it
    (one skull-hugging piece). The beanie was drawn to sit on the long hair, so
    it is shifted down / squashed to sit on the short cut.
  * Fall: the side buns + braids are one closed overlay piece (the "curtain").
    Deleting it leaves the bowl cut; the painted hairpin lives in the atlas and
    is removed from the texture (see patch_atlas.py) because only this piece
    samples that region.
Piece numbering is per-mesh and mirrors with vertex order, so it is re-derived
here from the mesh being edited rather than hard-coded from v4.
"""
import sys
sys.path.insert(0, '/tmp/re')
import numpy as np
from carve import comps          # connected-component split of a primitive
from glbtool import write_acc, save
import lib

# ---- winter side: hat placement -------------------------------------------------
HAT_PIECES   = [1, 2, 3]     # pompom, crown, band  (after the drop below)
HAIR_DROP    = [5, 6, 7, 8, 9]
Y_BRIM       = 1.886         # band's original bottom edge, used as the pivot
HAT_DY       = -0.18         # slide the beanie down onto the short cut
HAT_K        = 0.95          # and squash it slightly

# ---- fall: buns, braids, ornament ---------------------------------------------
FALL_DROP    = [1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
#  1  closed overlay carrying both side buns + braids
#  5,6  wrist cuffs of the braids        7,8 buns
#  9    painted hairpin mesh            10,11 gold pins
#  12,13,14 gold crown                  15 red jewel


def drop_tris(m, pids):
    cs = comps(m)
    dead = set()
    for i in pids:
        dead.update(int(x) for x in cs[i])
    I = m['idx'].copy()
    for ti, t in enumerate(I):
        if any(int(x) in dead for x in t):
            I[ti] = 0
    return I


def boy_winter_side(m):
    cs = comps(m)
    P = m['pos'].copy()
    for i in HAT_PIECES:
        v = cs[i]
        P[v, 1] = Y_BRIM + (P[v, 1] - Y_BRIM) * HAT_K + HAT_DY
    out = dict(m); out['pos'] = P; out['idx'] = drop_tris(m, HAIR_DROP)
    return out


def boy_fall(m):
    out = dict(m); out['idx'] = drop_tris(m, FALL_DROP)
    return out


def main(src, dst):
    js, bin_, ms, prims = lib.load_meshes(src)
    by = {m['name']: m for m in ms}
    new = {'Moving_Characters_Winter_side': boy_winter_side(by['Moving_Characters_Winter_side']),
           'Moving_Characters_Fall_character': boy_fall(by['Moving_Characters_Fall_character'])}
    out_bin = bin_
    for p in prims:
        if p['name'] not in new:
            continue
        m = new[p['name']]
        out_bin = write_acc(out_bin, js, p['pos_acc'], (m['pos'] - p['t']).astype(np.float32))
        out_bin = write_acc(out_bin, js, p['idx_acc'], m['idx'].astype(np.uint32))
    save(dst, js, out_bin)
    print('wrote', dst)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/work/cur_decoded.glb',
         sys.argv[2] if len(sys.argv) > 2 else '/tmp/work/MC-boy3-raw.glb')
