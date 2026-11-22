import sys; sys.path.insert(0,'/tmp'); sys.path.insert(0,'/tmp/re')
import raster
from boy4 import GROUPS
from PIL import Image
raster.GEO='/tmp/mc_flat.json'
ms=raster.load()
keys=list(GROUPS)
tiles=[]
for k in keys:
    g=[m for m in ms if m['name'] in GROUPS[k]]
    tiles.append(raster.render(g,size=430))
W=len(tiles)*430
c=Image.new('RGB',(W,440),'white')
for i,t in enumerate(tiles): c.paste(t,(i*430,5))
c.save('/tmp/final_all.png')
print('groups:',keys)
print('saved /tmp/final_all.png')
