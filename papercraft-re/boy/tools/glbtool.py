"""Read/write a non-Draco GLB: extract per-node world positions, patch them back."""
import json, struct
import numpy as np

DT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def load(p):
    d = open(p, 'rb').read()
    off = 12; ch = []
    while off < len(d):
        clen, ctype = struct.unpack('<II', d[off:off+8])
        ch.append((ctype, d[off+8:off+8+clen])); off += 8 + clen
    js = json.loads(ch[0][1].decode('utf-8'))
    return js, ch[1][1]


def save(p, js, bin_):
    jb = json.dumps(js, separators=(',', ':')).encode('utf-8')
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    bb = bin_ + b'\x00' * ((4 - len(bin_) % 4) % 4)
    body = (struct.pack('<II', len(jb), 0x4E4F534A) + jb
            + struct.pack('<II', len(bb), 0x004E4942) + bb)
    open(p, 'wb').write(struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body)


def acc_view(js, idx):
    a = js['accessors'][idx]; bv = js['bufferViews'][a['bufferView']]
    dt = DT[a['componentType']]; n = NC[a['type']]; isz = dt(0).itemsize
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or isz * n
    return a, start, stride, dt, n, isz


def read_acc(js, bin_, idx):
    a, start, stride, dt, n, isz = acc_view(js, idx)
    out = np.empty((a['count'], n), dtype=dt)
    for i in range(a['count']):
        out[i] = np.frombuffer(bin_, dtype=dt, count=n, offset=start + i * stride)
    return out


def write_acc(bin_, js, idx, arr):
    a, start, stride, dt, n, isz = acc_view(js, idx)
    arr = np.asarray(arr)
    if arr.ndim == 1:
        arr = arr.reshape(-1, 1)
    if n == 1 and arr.shape[1] != 1:
        arr = arr.reshape(-1, 1)
    elif n > 1 and arr.shape[1] != n:
        arr = arr.reshape(-1, n)
    b = bytearray(bin_)
    fmt = '<' + ('f' if dt is np.float32 else 'I') * n
    flat = np.ascontiguousarray(arr, dtype=dt)
    for i in range(a['count']):
        struct.pack_into(fmt, b, start + i * stride, *flat[i])
    return bytes(b)


def meshes_world(p):
    js, bin_ = load(p)
    out = []
    for ni, nd in enumerate(js['nodes']):
        if 'mesh' not in nd:
            continue
        t = np.array(nd.get('translation', [0, 0, 0]), dtype=np.float64)
        for pi, pr in enumerate(js['meshes'][nd['mesh']]['primitives']):
            P = read_acc(js, bin_, pr['attributes']['POSITION']).astype(np.float64)
            UV = (read_acc(js, bin_, pr['attributes']['TEXCOORD_0']).astype(np.float64)
                  if 'TEXCOORD_0' in pr['attributes'] else None)
            I = read_acc(js, bin_, pr['indices']).astype(np.int64).ravel() if 'indices' in pr else None
            out.append(dict(name=nd.get('name', ''), node_idx=ni, prim_idx=pi,
                            pos=P + t, uv=UV,
                            idx=I.reshape(-1, 3) if I is not None else None,
                            pos_acc=pr['attributes']['POSITION'],
                            idx_acc=pr.get('indices'), t=t))
    return js, bin_, out
