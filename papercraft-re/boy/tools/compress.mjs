// Draco-compress a patched GLB, then write a decoded copy of exactly what ships
// so the result can be rendered/verified without a browser.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, prune, dedup } from '@gltf-transform/functions';
import draco3d from 'draco3d';
import fs from 'node:fs';
const [src, dst, verify] = process.argv.slice(2);
const dec = await draco3d.createDecoderModule();
const enc = await draco3d.createEncoderModule();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': dec, 'draco3d.encoder': enc });
const doc = await io.read(src);
await doc.transform(dedup(), prune(),
  draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
await io.write(dst, doc);
console.log('compressed ->', dst, fs.statSync(dst).size, 'bytes');
if (verify) {
  const d2 = await io.read(dst);
  d2.getRoot().listExtensionsUsed().forEach((e) => e.dispose && e.dispose());
  await io.write(verify, d2);
  console.log('verify copy ->', verify);
}
