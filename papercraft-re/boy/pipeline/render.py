"""Render the six views with the papercut material, for review."""
import sys, math, os
import bpy, numpy as np

import os
GLB = next((a for a in sys.argv if a.endswith('.glb')), '/tmp/gen/Moving_Characters-boy.glb')
OUT = next((a for a in sys.argv[1:] if a.endswith('.png')), '/tmp/gen/render.png')
ATLAS = '/tmp/gen/atlas.png'

def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.945, 0.925, 0.886, 1)
    bg.inputs['Strength'].default_value = 1.0
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = False
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'Standard'
    return sc

def flat_mat():
    m = bpy.data.materials.new('paper')
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL':
            nt.nodes.remove(n)
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    # No v flip here: the GLB stores bottom-up UVs that the exporter flipped once
    # for the web, and importing it flips them back, so Blender's Image Texture
    # samples exactly what three.js (flipY = false) will.
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(ATLAS)
    tex.interpolation = 'Linear'
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Strength'].default_value = 1.0
    nt.links.new(tex.outputs['Color'], em.inputs['Color'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return m

def render_view(names, img_path, res=560, pad=0.16):
    mat = flat_mat()
    for o in bpy.data.objects:
        if o.type != 'MESH':
            continue
        o.hide_render = o.name not in names
        o.data.materials.clear()
        o.data.materials.append(mat)
    # camera framing from visible geometry
    import mathutils
    pts = []
    for o in bpy.data.objects:
        if o.type != 'MESH' or o.hide_render:
            continue
        for c in o.bound_box:
            pts.append(o.matrix_world @ mathutils.Vector(c))
    xs = [p.x for p in pts]; ys = [p.z for p in pts]     # z is up in Blender
    cx, cy = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
    h = max(max(ys)-min(ys), (max(xs)-min(xs)) * 0.6)
    cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'
    cam_data.ortho_scale = max(h, max(xs)-min(xs)) / (1 - 2*pad)
    cam = bpy.data.objects.new('cam', cam_data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = (cx, -8, cy)
    cam.rotation_euler = (math.radians(90), 0, 0)   # look along +Y
    bpy.context.scene.camera = cam
    sc = bpy.context.scene
    sc.render.resolution_x = res; sc.render.resolution_y = res
    sc.render.filepath = img_path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)
    return img_path

VIEWS = {
 'winter_front': ['Moving_Characters_Winter_head_front','Moving_Characters_Winter_front_character',
                  'Moving_Characters_Winter_front_smile_face','Moving_Characters_Winter_Front_Smile',
                  'Moving_Characters_Winter_front_smile','Moving_Characters_Winter_happy_face',
                  'Moving_Characters_Winter_arm_left_front','Moving_Characters_Winter_arm_right_front',
                  'Moving_Characters_Winter_left_arm','Moving_Characters_Winter_right_arm',
                  'Moving_Characters_Winter_left_foot','Moving_Characters_Winter_right_foot'],
 'winter_side': ['Moving_Characters_Winter_side','Moving_Characters_Winter_side_face',
                 'Moving_Characters_Winter_side_face_smile'],
 'spring_front': ['Moving_Characters_Spring_front'],
 'spring_side': ['Moving_Characters_Spring_side','Moving_Characters_Spring_side_face',
                 'Moving_Characters_Spring_side_face_smile','Moving_Characters_Spring_side_front_wheel',
                 'Moving_Characters_Spring_side_back_wheel'],
 'summer': ['Moving_Characters_Summer_character','Moving_Characters_Summer_happy_face',
            'Moving_Characters_Summer_character_Wave','Moving_Characters_Summer_left_arm',
            'Moving_Characters_Summer_right_arm'],
 'fall': ['Moving_Characters_Fall_character','Moving_Characters_Fall_face',
          'Moving_Characters_Fall_left_arm','Moving_Characters_Fall_right_arm'],
}

if __name__ == '__main__':
    setup()
    bpy.ops.import_scene.gltf(filepath=GLB)   # importer already brings Y-up to Z-up
    print('imported objects:', len([o for o in bpy.data.objects if o.type == 'MESH']))
    paths = []
    for i, (k, names) in enumerate(VIEWS.items()):
        p = render_view(names, '/tmp/gen/view_%s.png' % k)
        paths.append(p)
        print('rendered', k)
