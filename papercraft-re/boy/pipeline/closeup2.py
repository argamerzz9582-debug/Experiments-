import sys
sys.path.insert(0, '/tmp/gen')
import bpy, math, mathutils, render

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/tmp/gen/Moving_Characters-boy.glb')
mat = render.flat_mat()
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.data.materials.clear(); o.data.materials.append(mat)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.95, 0.93, 0.89, 1)
cd = bpy.data.cameras.new('c'); cd.type = 'ORTHO'; cd.ortho_scale = 1.25
cam = bpy.data.objects.new('c', cd); sc.collection.objects.link(cam); sc.camera = cam
sc.render.resolution_x = sc.render.resolution_y = 460
tgt = mathutils.Vector((0, 0, 1.55))
pairs = [('winter_front','Moving_Characters_Winter_head_front'),
         ('spring_front','Moving_Characters_Spring_front')]
for tag, keepname in pairs:
    for o in bpy.data.objects:
        if o.type == 'MESH':
            o.hide_render = (o.name not in (keepname, "Moving_Characters_Winter_front_smile_face"))
    cam.location = (tgt.x, -6, tgt.z); cam.rotation_euler = (math.radians(90), 0, 0)
    sc.render.filepath = '/tmp/gen/h_%s.png' % tag
    bpy.ops.render.render(write_still=True)
    print('rendered', tag)
