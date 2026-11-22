import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, prune, dedup } from '@gltf-transform/functions';
import draco3d from 'draco3d';
import fs from 'node:fs';
const dec = await draco3d.createDecoderModule();
const enc = await draco3d.createEncoderModule();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': dec, 'draco3d.encoder': enc });
const doc = await io.read('/tmp/Moving_Characters-boy-raw.glb');
await doc.transform(dedup(), prune(), draco({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
await io.write('/tmp/Moving_Characters-transformed-boy.glb', doc);
console.log('compressed ->', fs.statSync('/tmp/Moving_Characters-transformed-boy.glb').size, 'bytes');
