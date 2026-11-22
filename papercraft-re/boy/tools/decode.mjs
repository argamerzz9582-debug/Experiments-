// Decode Draco only - keep the node hierarchy/TRS exactly as authored.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3d';
const dec = await draco3d.createDecoderModule();
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': dec });
const doc = await io.read('/tmp/pc/public/models/Moving_Characters-transformed.glb');
// strip draco so positions are stored raw
doc.getRoot().listExtensionsUsed().forEach((e) => e.dispose && e.dispose());
await io.write('/tmp/mc_decoded.glb', doc);
console.log('decoded ok');
