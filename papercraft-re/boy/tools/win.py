import sys; sys.path.insert(0,'/tmp/re')
import numpy as np, lib

def render_win(meshes, xlim, ylim, size=700, bg=(255,255,255)):
    T = lib.tex()
    sx = size/(xlim[1]-xlim[0]); sy = size/(ylim[1]-ylim[0])
    s = min(sx, sy)
    cx=(xlim[0]+xlim[1])/2; cy=(ylim[0]+ylim[1])/2
    img=np.zeros((size,size,3),np.float64); img[:]=bg
    zb=np.full((size,size),-1e9,np.float32)
    for m in meshes:
        if m['uv'] is None: continue
        P,U=m['pos'],m['uv']
        px=(P[:,0]-cx)*s+size/2; py=size/2-(P[:,1]-cy)*s
        for t in m['idx']:
            x0,x1,x2=px[t[0]],px[t[1]],px[t[2]]; y0,y1,y2=py[t[0]],py[t[1]],py[t[2]]
            area=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0)
            if abs(area)<1e-9: continue
            xmin=max(int(np.floor(min(x0,x1,x2))),0); xmax=min(int(np.ceil(max(x0,x1,x2))),size-1)
            ymin=max(int(np.floor(min(y0,y1,y2))),0); ymax=min(int(np.ceil(max(y0,y1,y2))),size-1)
            if xmin>xmax or ymin>ymax: continue
            gx,gy=np.meshgrid(np.arange(xmin,xmax+1)+0.5,np.arange(ymin,ymax+1)+0.5)
            w0=((x1-gx)*(y2-gy)-(x2-gx)*(y1-gy))/area
            w1=((x2-gx)*(y0-gy)-(x0-gx)*(y2-gy))/area
            w2=1-w0-w1
            ins=(w0>=-1e-6)&(w1>=-1e-6)&(w2>=-1e-6)
            if not ins.any(): continue
            z=w0*P[t[0],2]+w1*P[t[1],2]+w2*P[t[2],2]
            sub=zb[ymin:ymax+1,xmin:xmax+1]
            w=ins&(z>sub)
            if not w.any(): continue
            ii=np.nonzero(w)
            u=w0[ii]*U[t[0],0]+w1[ii]*U[t[1],0]+w2[ii]*U[t[2],0]
            v=w0[ii]*U[t[0],1]+w1[ii]*U[t[1],1]+w2[ii]*U[t[2],1]
            img[ymin:ymax+1,xmin:xmax+1][ii]=lib.sample(u,v)
            sub[ii]=z[ii]
    from PIL import Image
    return Image.fromarray(np.clip(img,0,255).astype(np.uint8))
