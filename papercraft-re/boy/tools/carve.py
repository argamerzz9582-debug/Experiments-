import sys; sys.path.insert(0,'/tmp/re')
import numpy as np, lib

def comps(m):
    """Stable piece list computed on the ORIGINAL mesh. Never re-derive after edits."""
    return [v for v in lib.components(m) if len(v)>=3]

def carve(m, cs, rules):
    tris = m['idx']; P = m['pos']
    keep = np.ones(len(tris), bool)
    cen = P[tris].mean(1)
    for pid, pred in rules:
        S = set(int(x) for x in cs[pid])
        for ti, t in enumerate(tris):
            if not keep[ti]: continue
            if not all(int(x) in S for x in t): continue
            if pred(cen[ti,0], cen[ti,1], cen[ti,2]): keep[ti] = False
    out = dict(m); out['idx'] = tris[keep]
    return out

def drop(m, cs, pids):
    dead=set()
    for i in pids: dead.update(int(x) for x in cs[i])
    out=dict(m)
    out['idx']=np.array([t for t in m['idx'] if not any(int(x) in dead for x in t)],dtype=np.int64).reshape(-1,3)
    return out

def edit(m, drop_ids=(), rules=()):
    cs = comps(m)
    out = drop(m, cs, drop_ids) if drop_ids else dict(m)
    if rules: out = carve(out, cs, rules)
    return out
