"""Sample the shipped atlas through the GLB's own UVs, exactly like three.js does
with flipY=false (v=0 = top row of the image), and report each node's mean colour.

That is the check that catches a UV/atlas mismatch without a browser: a part whose
mean colour is the paper background is sampling the wrong rectangle.
"""
import json, struct, sys
import numpy as np
from PIL import Image

GLB = sys.argv[1]
ATLAS = sys.argv[2]
d = open(GLB, 'rb').read()
off, ch = 12, []
while off < len(d):
    n, t = struct.unpack('<II', d[off:off + 8]); ch.append(d[off + 8:off + 8 + n]); off += 8 + n
js = json.loads(ch[0].decode()); bin_ = ch[1]
img = np.asarray(Image.open(ATLAS).convert('RGB')).astype(float)
H, W = img.shape[:2]
PAPER = np.array([247, 244, 238])


def acc(i):
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
    dt = {5126: 'f4', 5123: 'u2', 5125: 'u4'}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    row, it = n * np.dtype(dt).itemsize, np.dtype(dt).itemsize
    flat = np.frombuffer(bin_, dtype='u1', count=bv['byteLength'], offset=bv.get('byteOffset', 0))
    stride = bv.get('byteStride') or row
    if stride == row:
        return np.frombuffer(flat[a.get('byteOffset', 0):a.get('byteOffset', 0) + row * a['count']],
                             dtype=dt).reshape(-1, n)
    out = np.zeros((a['count'], n), dtype=dt)
    for k in range(a['count']):
        s = a.get('byteOffset', 0) + k * stride
        out[k] = np.frombuffer(flat[s:s + row], dtype=dt, count=n)
    return out


bad = 0
for node in js['nodes']:
    prim = js['meshes'][node['mesh']]['primitives'][0]
    uv = acc(prim['attributes']['TEXCOORD_0'])
    xs = np.clip((uv[:, 0] * (W - 1)).astype(int), 0, W - 1)
    ys = np.clip((uv[:, 1] * (H - 1)).astype(int), 0, H - 1)   # flipY = false
    col = img[ys, xs]
    mean = col.mean(0)
    dist = np.linalg.norm(mean - PAPER)
    flag = 'PAPER!' if dist < 14 else 'ok'
    if flag != 'ok':
        bad += 1
    print('%-44s mean rgb %-18s dist-from-paper %5.1f  %s'
          % (node['name'].replace('Moving_Characters_', ''), mean.round(0).astype(int), dist, flag))
print('\n%d/%d nodes sampling paper background' % (bad, len(js['nodes'])))
sys.exit(1 if bad else 0)
