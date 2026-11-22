import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3d';
import fs from 'node:fs';
const dec = await draco3d.createDecoderModule();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': dec });
const [src, dst] = process.argv.slice(2);
const doc = await io.read(src);
const out = [];
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'); if (!pos) continue;
    const a = pos.getArray(); const t = node.getTranslation();
    const arr = new Array(a.length);
    for (let i = 0; i < a.length; i += 3) {
      arr[i] = a[i] + t[0]; arr[i+1] = a[i+1] + t[1]; arr[i+2] = a[i+2] + t[2];
    }
    const uv = prim.getAttribute('TEXCOORD_0'); const ind = prim.getIndices();
    out.push({ name: node.getName(), pos: arr, uv: uv ? Array.from(uv.getArray()) : [],
               idx: ind ? Array.from(ind.getArray()) : null,
               count: pos.getCount() });
  }
}
fs.writeFileSync(dst, JSON.stringify({ meshes: out }));
console.log('dumped', out.length, 'primitives ->', dst);
