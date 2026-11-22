// Decode the Draco GLB currently shipped in the site, keeping node TRS.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3d';
const [src, dst] = process.argv.slice(2);
const dec = await draco3d.createDecoderModule();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': dec });
const doc = await io.read(src);
doc.getRoot().listExtensionsUsed().forEach((e) => e.dispose && e.dispose());
await io.write(dst, doc);
console.log('decoded', src, '->', dst);
