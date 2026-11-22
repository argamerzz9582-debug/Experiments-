"""Full boy transform on the real GLB: deform positions, drop strands, write back."""
import sys
sys.path.insert(0, '/tmp'); sys.path.insert(0, '/tmp/re')
import numpy as np
from glbtool import meshes_world, write_acc, save
from boy4 import GROUPS, group_face, apply
from boy2 import piece_info, face_piece
import raster

SRC = '/tmp/mc_decoded.glb'
DST = '/tmp/Moving_Characters-boy-raw.glb'

js, bin_, prims = meshes_world(SRC)
# convert to the structure boy4 expects
meshes = [dict(name=p['name'], pos=p['pos'], uv=p['uv'], idx=p['idx']) for p in prims]

def fallback_face(ms_group):
    """If no skin piece exists, take the bbox of the *_face mesh."""
    fb = None
    for m in ms_group:
        if not m['name'].endswith('face'):
            continue
        P = m['pos']
        box = dict(n=9999, x0=float(P[:,0].min()), x1=float(P[:,0].max()),
                   y0=float(P[:,1].min()), y1=float(P[:,1].max()))
        if fb is None or (box['y1']-box['y0']) > (fb['y1']-fb['y0']):
            fb = box
    return fb

# winter_side is a profile view whose hair mass is shared with the body, and
# Fall has buns + long braids - neither converts cleanly with a geometric cut,
# so they are left as authored.
SKIP = {'winter_side', 'fall'}

changed = {}
for key in GROUPS:
    if key in SKIP:
        print('  group %-13s skipped (needs hand-authored hair)' % key)
        continue
    face = group_face(meshes, key)
    if face is None:
        face = fallback_face([m for m in meshes if m['name'] in GROUPS[key]])
        if face:
            print('  group %-13s fallback face bbox y[%.2f,%.2f]' % (key, face['y0'], face['y1']))
        else:
            print('  group %-13s STILL no face' % key)
    for m in [x for x in meshes if x['name'] in GROUPS[key]]:
        newm, moved, dropped = apply(m, face)
        if moved or dropped:
            changed[m['name']] = (newm, moved, dropped)

print('meshes changed:', len(changed))
for n, (nm, mv, dr) in changed.items():
    print('  %-44s vtx=%-4d tris=%-3d' % (n[:44], mv, dr))

bin2 = bin_
for p in prims:
    if p['name'] not in changed:
        continue
    newm = changed[p['name']][0]
    # world -> local (translation only, verified)
    local = newm['pos'] - p['t']
    bin2 = write_acc(bin2, js, p['pos_acc'], local.astype(np.float32))
    # drop strands by collapsing triangles (keeps buffer length identical)
    if p['idx'] is not None and len(newm['idx']) == len(p['idx']):
        bin2 = write_acc(bin2, js, p['idx_acc'], np.asarray(newm['idx']).astype(np.uint32))

save(DST, js, bin2)
import os
print('wrote', DST, os.path.getsize(DST), 'bytes')
