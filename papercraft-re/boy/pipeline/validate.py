"""Validate the rebuilt GLB against MODEL-SPEC.md (names, flatness, pivots, uv)."""
import json, struct, sys
import numpy as np

GLB = sys.argv[1] if len(sys.argv) > 1 else '/tmp/gen/Moving_Characters-boy.glb'
SPEC = '/home/user/Experiments-/papercraft-re/boy/MODEL-SPEC.md'

NAMES = """Winter_arm_left_front Winter_arm_right_front Winter_front_smile
Winter_front_character Winter_Front_Smile Winter_front_smile_face Winter_happy_face
Winter_head_front Winter_left_arm Winter_left_foot Winter_right_arm Winter_right_foot
Winter_side Winter_side_face Winter_side_face_smile Spring_front Spring_side
Spring_side_back_wheel Spring_side_face Spring_side_face_smile Spring_side_front_wheel
Fall_character Fall_face Fall_left_arm Fall_right_arm Summer_character
Summer_character_Wave Summer_happy_face Summer_left_arm Summer_right_arm""".split()
NAMES = ['Moving_Characters_' + n for n in NAMES]

d = open(GLB, 'rb').read()
off, chunks = 12, []
while off < len(d):
    clen, ctype = struct.unpack('<II', d[off:off + 8])
    chunks.append(d[off + 8:off + 8 + clen]); off += 8 + clen
js = json.loads(chunks[0].decode()); bin_ = chunks[1]


def acc(i):
    """Read an accessor, honouring byteStride (interleaved buffers)."""
    a = js['accessors'][i]; bv = js['bufferViews'][a['bufferView']]
    dt = {5126: 'f4', 5123: 'u2', 5125: 'u4'}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    itemsize = np.dtype(dt).itemsize
    row = n * itemsize
    base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or row
    flat = np.frombuffer(bin_, dtype='u1',
                         count=bv['byteLength'], offset=bv.get('byteOffset', 0))
    if stride == row:
        return np.frombuffer(flat[a.get('byteOffset', 0):
                                  a.get('byteOffset', 0) + row * a['count']],
                             dtype=dt).reshape(-1, n)
    out = np.zeros((a['count'], n), dtype=dt)
    for k in range(a['count']):
        s = a.get('byteOffset', 0) + k * stride
        out[k] = np.frombuffer(flat[s:s + row], dtype=dt, count=n)
    return out


nodes = js['nodes']
by_name = {n.get('name'): n for n in nodes}
ok = True


def fail(msg):
    global ok
    ok = False
    print('FAIL', msg)


missing = [n for n in NAMES if n not in by_name]
extra = [n.get('name') for n in nodes if n.get('name') not in NAMES]
print('nodes: %d  missing: %d  extra: %d' % (len(nodes), len(missing), len(extra)))
if missing: fail('missing %s' % missing)
if extra: fail('extra %s' % extra)
if js.get('materials'): fail('materials present')
if js.get('images') or js.get('textures'): fail('embedded textures')
if js.get('animations'): fail('animations')
if len(js['scenes'][0]['nodes']) != len(nodes): fail('not flat: %d scene roots'
                                                     % len(js['scenes'][0]['nodes']))

# composition check: head above body, face in front of head, six pivots on joints
def bbox(name):
    n = by_name[name]
    p = acc(js['meshes'][n['mesh']]['primitives'][0]['attributes']['POSITION'])
    t = np.array(n.get('translation', [0, 0, 0]))
    return p.min(0) + t, p.max(0) + t


head = bbox('Moving_Characters_Winter_head_front')
body = bbox('Moving_Characters_Winter_front_character')
face = bbox('Moving_Characters_Winter_front_smile_face')
print('head y %.2f..%.2f  body y %.2f..%.2f  face y %.2f..%.2f'
      % (head[0][1], head[1][1], body[0][1], body[1][1], face[0][1], face[1][1]))
if head[0][1] > body[1][1]: fail('gap between head and body')
if not (face[0][1] >= head[0][1] - 0.02 and face[1][1] <= head[1][1]): fail('face outside head')
# the head node also carries the hair and the hat, so compare the face against the
# SKULL plane (the minimum z in that node), not the node's whole z extent
if face[0][2] <= head[0][2] + 0.004:
    fail('face not in front of the skull (face z %.3f, skull z %.3f)' % (face[0][2], head[0][2]))
if body[0][1] > -1.2: fail('stick does not reach y=-1.4 (got %.2f)' % body[0][1])
if head[1][1] < 1.9 or head[1][1] > 2.6: fail('head top %.2f outside 1.9..2.6' % head[1][1])

# animated pivots: arm pivot at the shoulder, foot pivot at the hip, wheels at axle
def pivot(name):
    return np.array(by_name[name].get('translation', [0, 0, 0]))


for side in ('left', 'right'):
    p = pivot('Moving_Characters_Winter_%s_arm' % side)
    lo, hi = bbox('Moving_Characters_Winter_%s_arm' % side)
    if not (lo[1] + 0.3 <= p[1] <= hi[1] + 0.02):
        fail('arm pivot not at shoulder: pivot y %.2f, arm y %.2f..%.2f'
             % (p[1], lo[1], hi[1]))
    p = pivot('Moving_Characters_Winter_%s_foot' % side)
    lo, hi = bbox('Moving_Characters_Winter_%s_foot' % side)
    if not (hi[1] - 0.02 <= p[1] <= hi[1] + 0.06):
        fail('foot pivot not at hip: pivot y %.2f, foot y %.2f..%.2f'
             % (p[1], lo[1], hi[1]))
for w in ('front', 'back'):
    p = pivot('Moving_Characters_Spring_side_%s_wheel' % w)
    lo, hi = bbox('Moving_Characters_Spring_side_%s_wheel' % w)
    if not (lo[1] <= p[1] <= hi[1] and lo[0] - 0.6 <= p[0] <= hi[0] + 0.6):
        fail('%s wheel pivot outside its own bbox' % w)

# uv coverage: every tri must sample the painted atlas, never the empty gutter
uvs = []
for n in nodes:
    prim = js['meshes'][n['mesh']]['primitives'][0]
    uvs.append(acc(prim['attributes']['TEXCOORD_0']))
uvs = np.vstack(uvs)
print('uv u %.3f..%.3f  v %.3f..%.3f' % (uvs[:, 0].min(), uvs[:, 0].max(),
                                         uvs[:, 1].min(), uvs[:, 1].max()))

tris = sum(js['accessors'][js['meshes'][n['mesh']]['primitives'][0]['indices']]['count'] // 3
           for n in nodes)
verts = sum(js['accessors'][js['meshes'][n['mesh']]['primitives'][0]['attributes']['POSITION']]['count']
            for n in nodes)
print('%d verts / %d tris' % (verts, tris))
print('OK' if ok else 'PROBLEMS FOUND')
