"""Assemble the six seasonal views of the paper-cut boy as ONE glb.

Every part is placed from layout.py; node names and animated pivots follow
papercraft-re/boy/MODEL-SPEC.md so the file stays drop-in for the site.
"""
import sys, math
sys.path.insert(0, '/tmp/gen')
import bpy
from mesh import make_part, RECTS, ATLAS_W, ATLAS_H
import layout as L

OUT = '/tmp/gen/Moving_Characters-boy.glb'


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def capture_uvs(ob):
    """vertex index -> uv, as painted by mesh.py (correct by construction)."""
    me = ob.data
    uvl = me.uv_layers[0].data
    out = {}
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            out.setdefault(vi, tuple(uvl[li].uv))
    return out


def restore_uvs(ob, uvs):
    """Re-apply the captured UVs.

    Everything `new()` does afterwards - non-uniform scaling, recentring, the
    re-origin around a joint pivot - moves vertices without touching UVs, so any
    UV recomputed from the final coordinates would drift off the painted rect.
    Capturing once and restoring is exact and independent of the transforms.
    """
    me = ob.data
    uvl = me.uv_layers[0].data
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            uvl[li].uv = uvs[vi]


def new(name, h, x, zorder, w=None, bottom=None, cy=None, pivot=None, **kw):
    """Place a part, sized by its *visible* silhouette (not by the painted rect).

    `bottom` / `cy` are world-space anchors; `pivot`, if given, is an absolute
    world point and becomes the node's translation, with the mesh re-origined
    around it - that is what makes the six animated nodes rotate on their joint.
    The y slot is -zorder because glTF z = -blender_y, so negating here is what
    makes "bigger zorder = nearer the camera" true in three.js as well.
    """
    ob = make_part(name, 1.0, **kw)
    uvs = capture_uvs(ob)
    xs = [v.co.x for v in ob.data.vertices]
    zs = [v.co.z for v in ob.data.vertices]
    w0 = max(xs) - min(xs)
    sw = (w / w0) if w else (h / (max(zs) - min(zs)))
    sz = h / (max(zs) - min(zs))
    for v in ob.data.vertices:
        v.co.x *= sw
        v.co.z *= sz
    xs = [v.co.x for v in ob.data.vertices]
    zs = [v.co.z for v in ob.data.vertices]
    cx = (max(xs) + min(xs)) / 2
    if abs(cx) > 1e-9:
        for v in ob.data.vertices:
            v.co.x -= cx
    y0, y1 = min(zs), max(zs)
    if cy is not None:
        for v in ob.data.vertices:
            v.co.z -= (y0 + y1) / 2
        loc = (x, -zorder, cy)
    else:
        for v in ob.data.vertices:
            v.co.z -= y0
        loc = (x, -zorder, bottom)
    if pivot is not None:
        px, py = pivot
        for v in ob.data.vertices:
            v.co.x += loc[0] - px
            v.co.z += loc[2] - py
        loc = (px, -zorder, py)
    restore_uvs(ob, uvs)
    ob.location = loc
    return ob


def rename(ob, name):
    ob.name = name
    ob.data.name = name
    return ob


def join(parts, name):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    if len(parts) > 1:
        bpy.ops.object.join()
    return rename(bpy.context.view_layer.objects.active, name)


def clone(src, name, dy=0.0, scale=None):
    ob = src.copy(); ob.data = src.data.copy(); ob.name = name; ob.data.name = name
    bpy.context.scene.collection.objects.link(ob)
    if scale is not None:
        ob.scale = scale
    ob.location.z += dy
    return ob


# ------------------------------------------------------------------ pieces
def head_parts(hat=True):
    """The one head + hair used by every season (kiln: one skin reused)."""
    hair = new('hair', L.HAIR_H, 0, L.Z_HAIR, w=L.HAIR_W, bottom=L.HAIR_BOT)
    head = new('head', L.HEAD_H, 0, L.Z_HEAD, w=L.HEAD_W, bottom=L.HEAD_BOT)
    parts = [hair, head]
    if hat:
        parts.append(new('hat', L.HAT_H, 0, L.Z_DET, w=L.HAT_W, bottom=L.HAT_BOT))
    return parts


def stick(top=1.02):
    return new('stick', L.STICK_H, 0, L.Z_STICK, w=L.STICK_W, bottom=L.STICK_BOT)


def limbs(shoes=True, arm_bot=None):
    arm_bot = L.ARM_BOT if arm_bot is None else arm_bot
    out = []
    for sx in (1, -1):
        out.append(new('arm', L.ARM_H, sx * 0.31, L.Z_ARM, w=L.ARM_W,
                       bottom=arm_bot))
        out.append(new('leg', L.LEG_H, sx * 0.10, L.Z_BODY, w=L.LEG_W, bottom=L.LEG_BOT))
        if shoes:
            out.append(new('shoe', L.SHOE_H, sx * 0.11, L.Z_CLOTH, w=L.SHOE_W,
                           bottom=L.FEET_BOT))
    return out


# ------------------------------------------------------------------ seasons
def winter_front():
    head = join(head_parts(), 'Moving_Characters_Winter_head_front')
    f0 = new('face', L.FACE_H, 0, L.Z_FACE, w=L.FACE_W, cy=L.FACE_CY)
    face = clone(f0, 'Moving_Characters_Winter_front_smile_face')
    happy = clone(f0, 'Moving_Characters_Winter_happy_face')
    smile = rename(new('mouth', 0.10, 0, L.Z_DET, w=0.15, cy=L.FACE_CY - 0.12),
                   'Moving_Characters_Winter_Front_Smile')
    tiny = rename(new('mouth', 0.10, 0, L.Z_DET - 0.002, w=0.15,
                      cy=L.FACE_CY - 0.12),
                  'Moving_Characters_Winter_front_smile')
    bpy.data.objects.remove(f0, do_unlink=True)

    coat = new('coat', L.COAT_H, 0, L.Z_CLOTH, w=L.BODY_W, bottom=L.BODY_BOT)
    scarf = new('scarf', 0.17, 0, L.Z_FACE - 0.004, w=0.40,
                bottom=L.BODY_BOT + L.COAT_H - 0.06)
    body = join([coat, scarf] + limbs() + [stick(1.06)],
                'Moving_Characters_Winter_front_character')

    arms = []
    for sx, nm in ((1, 'left'), (-1, 'right')):
        a = new('arm', L.ARM_H, sx * 0.31, L.Z_ARM + 0.004, w=L.ARM_W,
                bottom=L.ARM_BOT,
                pivot=(sx * 0.31, L.ARM_BOT + L.ARM_H - 0.05))
        arms.append(rename(a, 'Moving_Characters_Winter_%s_arm' % nm))
    feet = []
    for sx, nm in ((1, 'left'), (-1, 'right')):
        f = new('shoe', L.SHOE_H, sx * 0.11, L.Z_CLOTH + 0.004, w=L.SHOE_W,
                bottom=L.FEET_BOT, pivot=(sx * 0.11, L.FEET_BOT + L.SHOE_H))
        feet.append(rename(f, 'Moving_Characters_Winter_%s_foot' % nm))
    raised = []
    for sx, nm in ((1, 'left'), (-1, 'right')):
        # same geometry and pivot as the animated arm, just swung out: the
        # front/side swap then reads as a pose change, not a different limb
        r = new('arm', L.ARM_H, sx * 0.31, L.Z_BODY + 0.004, w=L.ARM_W,
                bottom=L.ARM_BOT + 0.06, pivot=(sx * 0.31, L.ARM_BOT + L.ARM_H - 0.01))
        r.rotation_euler = (0, math.radians(-38 * sx), 0)
        raised.append(join([r], 'Moving_Characters_Winter_arm_%s_front' % nm))
    return [head, face, happy, smile, tiny, body] + raised + arms + feet


def winter_side():
    hair = new('hair', L.HAIR_H, 0, L.Z_HAIR, w=L.HAIR_W, bottom=L.HAIR_BOT)
    head = new('head', L.HEAD_H, 0.05, L.Z_HEAD, w=L.HEAD_W, bottom=L.HEAD_BOT)
    hat = new('hat', L.HAT_H, 0.04, L.Z_DET, w=L.HAT_W, bottom=L.HAT_BOT)
    coat = new('coat', L.COAT_H, 0, L.Z_CLOTH, w=L.BODY_W, bottom=L.BODY_BOT)
    leg = new('leg', L.LEG_H, 0.02, L.Z_BODY, w=L.LEG_W, bottom=L.LEG_BOT)
    for o in (hair, head, hat, coat, leg):
        o.scale = (0.62, 1, 1)
    side = join([hair, head, hat, coat, leg, stick(1.06)], 'Moving_Characters_Winter_side')
    f0 = new('face', L.FACE_H * 0.9, 0.19, L.Z_FACE, w=L.FACE_W * 0.8, cy=L.FACE_CY)
    f0.scale = (0.70, 1, 1)
    rename(f0, 'Moving_Characters_Winter_side_face')
    fs = rename(new('mouth', 0.09, 0.26, L.Z_DET, w=0.13, cy=L.FACE_CY - 0.10),
                'Moving_Characters_Winter_side_face_smile')
    return [side, f0, fs]


def spring_front():
    hair = new('hair', L.HAIR_H, 0, L.Z_HAIR, w=L.HAIR_W, bottom=L.HAIR_BOT)
    head = new('head', L.HEAD_H, 0, L.Z_HEAD, w=L.HEAD_W, bottom=L.HEAD_BOT)
    tunic = new('tunic', L.TUNIC_H, 0, L.Z_CLOTH, w=L.BODY_W, bottom=L.BODY_BOT)
    face = new('face', L.FACE_H, 0, L.Z_FACE, w=L.FACE_W, cy=L.FACE_CY)
    return [join([hair, head, tunic, face] + limbs() + [stick(1.02)],
                 'Moving_Characters_Spring_front')]


def spring_side():
    hair = new('hair', L.HAIR_H, 0, L.Z_HAIR, w=L.HAIR_W, bottom=L.HAIR_BOT)
    head = new('head', L.HEAD_H, 0.05, L.Z_HEAD, w=L.HEAD_W, bottom=L.HEAD_BOT)
    tunic = new('tunic', L.TUNIC_H, 0, L.Z_CLOTH, w=L.BODY_W, bottom=L.BODY_BOT)
    leg = new('leg', L.LEG_H, 0.18, L.Z_BODY, w=L.LEG_W, bottom=L.LEG_BOT)
    leg.rotation_euler = (0, math.radians(-28), 0)
    for o in (hair, head, tunic):
        o.scale = (0.62, 1, 1)
    main = join([hair, head, tunic, leg, stick(1.00)], 'Moving_Characters_Spring_side')
    wf = new('wheel', 0.50, 0.34, L.Z_DET, bottom=0.10,
             pivot=(0.34, 0.10 + 0.25))
    rename(wf, 'Moving_Characters_Spring_side_front_wheel')
    wb = new('wheel', 0.50, -0.36, L.Z_DET, bottom=0.10,
             pivot=(-0.36, 0.10 + 0.25))
    rename(wb, 'Moving_Characters_Spring_side_back_wheel')
    f0 = new('face', L.FACE_H * 0.9, 0.19, L.Z_FACE + 0.002, w=L.FACE_W * 0.8,
             cy=L.FACE_CY)
    f0.scale = (0.70, 1, 1)
    rename(f0, 'Moving_Characters_Spring_side_face')
    fs = rename(new('mouth', 0.09, 0.26, L.Z_DET, w=0.13, cy=L.FACE_CY - 0.10),
                'Moving_Characters_Spring_side_face_smile')
    return [main, wf, wb, f0, fs]


def summer():
    hair = new('hair', L.HAIR_H, 0, L.Z_HAIR, w=L.HAIR_W, bottom=L.HAIR_BOT)
    head = new('head', L.HEAD_H, 0, L.Z_HEAD, w=L.HEAD_W, bottom=L.HEAD_BOT)
    top = new('stripe_top', 0.28, 0, L.Z_CLOTH, w=0.40, bottom=L.BODY_BOT + 0.16)
    shorts = new('shorts', 0.26, 0, L.Z_CLOTH - 0.002, w=0.42,
                 bottom=L.BODY_BOT - 0.02)
    legs = [new('leg', 0.24, sx * 0.10, L.Z_BODY, w=L.LEG_W, bottom=0.28)
            for sx in (1, -1)]
    board = new('board', 0.26, 0, L.Z_DET, w=0.78, bottom=0.02)
    char = join([hair, head, top, shorts, board] + legs + [stick(0.94)],
                'Moving_Characters_Summer_character')
    hv = rename(new('face', L.FACE_H, 0, L.Z_FACE, w=L.FACE_W, cy=L.FACE_CY),
                'Moving_Characters_Summer_happy_face')
    wave = rename(new('wave', 0.34, 0, L.Z_BACK, bottom=0.02),
                  'Moving_Characters_Summer_character_Wave')
    arms = []
    for sx, nm in ((1, 'left'), (-1, 'right')):
        a = new('arm', 0.36, sx * 0.24, L.Z_ARM + 0.004, w=L.ARM_W,
                bottom=L.BODY_BOT + 0.20,
                pivot=(sx * 0.24, L.BODY_BOT + 0.20 + 0.31))
        arms.append(rename(a, 'Moving_Characters_Summer_%s_arm' % nm))
    return [char, hv, wave] + arms


def fall():
    hair = new('hair', L.HAIR_H, 0, L.Z_HAIR, w=L.HAIR_W, bottom=L.HAIR_BOT)
    head = new('head', L.HEAD_H, 0, L.Z_HEAD, w=L.HEAD_W, bottom=L.HEAD_BOT)
    robe = new('robe', L.ROBE_H, 0, L.Z_CLOTH, w=L.BODY_W + 0.10,
               bottom=L.BODY_BOT - 0.04)
    prop = new('prop', 0.90, -0.47, L.Z_BACK, bottom=0.06)
    legs, shoes = [], []
    for sx in (1, -1):
        legs.append(new('leg', 0.22, sx * 0.10, L.Z_BODY, w=L.LEG_W, bottom=0.24))
        shoes.append(new('shoe', 0.16, sx * 0.11, L.Z_CLOTH, w=L.SHOE_W,
                         bottom=L.FEET_BOT))
    char = join([hair, head, robe, prop, stick(0.98)] + legs + shoes,
                'Moving_Characters_Fall_character')
    fa = rename(new('face', L.FACE_H, 0, L.Z_FACE, w=L.FACE_W, cy=L.FACE_CY),
                'Moving_Characters_Fall_face')
    arms = []
    for sx, nm in ((1, 'left'), (-1, 'right')):
        a = new('arm', 0.48, sx * 0.28, L.Z_ARM + 0.004, w=L.ARM_W,
                bottom=L.BODY_BOT + 0.10,
                pivot=(sx * 0.28, L.BODY_BOT + 0.10 + 0.40))
        arms.append(rename(a, 'Moving_Characters_Fall_%s_arm' % nm))
    return [char, fa] + arms


BUILDERS = (winter_front, winter_side, spring_front, spring_side, summer, fall)


def build_all():
    clear()
    objs = []
    for fn in BUILDERS:
        objs += fn()
    for o in bpy.data.objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for o in bpy.data.objects:
        o.select_set(False)
    return objs


def export(path=OUT):
    objs = build_all()
    print('objects:', len(bpy.data.objects))
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB',
                              export_apply=True, export_texcoords=True,
                              export_normals=True, export_materials='NONE',
                              export_yup=True)
    import os
    print('wrote', path, os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    export(sys.argv[-1] if sys.argv[-1].endswith('.glb') else OUT)
