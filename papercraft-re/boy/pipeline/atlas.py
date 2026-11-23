"""Hand-painted UV atlas for the paper-cut boy.

Every part is drawn as a flat cut-out with a soft paper drop-shadow and fibre
grain (the "papercut" look comes from these two, per kiln's character notes).
Parts are shelf-packed into a 2048^2 sheet, so no two rects ever overlap - an
overlap used to make the traced limbs grow a second prong.
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SHEET = 2048
PAD = 14

C = dict(
    skin=(238, 205, 186), skin_dk=(214, 176, 156), cheek=(233, 160, 158),
    hair=(108, 78, 60), hair_lt=(128, 95, 74), hair_dk=(84, 60, 45),
    brown_dk=(56, 38, 30), boot=(74, 52, 40),
    eye_white=(250, 247, 242), iris=(88, 64, 52), pupil=(42, 31, 26),
    mouth=(150, 74, 70), tongue=(206, 122, 118), white=(250, 247, 242),
    coat=(104, 126, 168), coat_dk=(84, 104, 144),
    scarf=(226, 226, 222), scarf_dk=(206, 206, 202),
    hat=(120, 142, 182), hat_dk=(98, 118, 158), hat_band=(90, 110, 148),
    pom=(216, 220, 226),
    tunic=(152, 174, 128), tunic_dk=(130, 150, 108),
    shorts=(110, 142, 178), shorts_dk=(94, 124, 158), stripe=(206, 146, 120),
    robe=(152, 66, 66), robe_dk=(130, 52, 52),
    wood=(150, 116, 82), wood_dk=(124, 94, 66),
    board=(190, 162, 124), board_dk=(164, 136, 100),
    leaf=(150, 172, 118), leaf_dk=(128, 150, 98),
    water=(196, 219, 233),
)


def new_layer(w, h):
    return Image.new('RGBA', (int(w), int(h)), (0, 0, 0, 0))


def _grain(size):
    """Fibrous paper noise, low amplitude, alpha-only."""
    a = np.asarray(Image.effect_noise(size, 26).filter(ImageFilter.GaussianBlur(1.1)))
    return a


def shadow(layer, blur=6, off=(3, 4), alpha=72, grain=True):
    a = layer.split()[3]
    sh = Image.new('RGBA', layer.size, (52, 38, 32, 0))   # warm paper shadow
    sh.putalpha(a.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: v * alpha // 255))
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.paste(sh, off, sh)
    if grain:
        g = _grain(layer.size).astype(np.float32)
        # grain only inside the cut-out: multiply by the part's own alpha
        a_f = np.asarray(a).astype(np.float32)
        alpha = np.clip(g * 0.11 * (a_f / 255.0), 0, 255).astype('uint8')
        fib = Image.fromarray(np.dstack([g.astype('uint8'),] * 3 + [alpha]).astype('uint8'))
        out = Image.alpha_composite(out, fib)
    return Image.alpha_composite(out, layer)


# ---------------------------------------------------------------- the parts
def draw_head(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    cx, cy, rx, ry = w * .5, h * .40, w * .335, h * .345
    d.rounded_rectangle([cx - rx * .34, cy + ry * .74, cx + rx * .34, h * .99],
                        radius=rx * .2, fill=C['skin'])            # neck
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=C['skin'])
    for sx in (-1, 1):
        ex = cx + sx * rx * .96
        d.ellipse([ex - rx * .17, cy + ry * .04, ex + rx * .17, cy + ry * .46], fill=C['skin'])
        d.ellipse([ex - rx * .09, cy + ry * .13, ex + rx * .09, cy + ry * .35], fill=C['skin_dk'])
    d.arc([cx - rx * .92, cy - ry * .86, cx + rx * .92, cy + ry * .30],
          200, 340, fill=(224, 188, 170), width=6)                 # jaw shading
    return shadow(L)


def draw_hair(w, h):
    """Cap + chunky locks. Only the forehead line sits low; the sides stay short
    so the face below is not buried."""
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    cx = w * .5
    dome_top, dome_mid, dome_rx = h * .04, h * .42, w * .475
    pts = [(cx - dome_rx, h * .66)]
    for i in range(61):
        a = math.pi + i * math.pi / 60
        pts.append((cx + math.cos(a) * dome_rx, dome_mid + math.sin(a) * (dome_mid - dome_top)))
    pts.append((cx + dome_rx, h * .66))
    n = 6                                        # fringe locks along the forehead
    for i in range(n):
        x0 = cx + dome_rx - (i * 2 * dome_rx / n)
        x1 = x0 - dome_rx / n
        pts += [(x0, h * .66), ((x0 + x1) / 2, h * (.80 - .06 * (i % 3))), (x1, h * .66)]
    d.polygon(pts, fill=C['hair'])
    for sx in (-1, 1):                           # short side locks in front of the ears
        x = cx + sx * dome_rx * .92
        d.polygon([(x, h * .40), (x - sx * w * .040, h * .46),
                   (x - sx * w * .045, h * .70), (x - sx * w * .008, h * .66)],
                  fill=C['hair_lt'])
    d.polygon([(cx - w * .10, h * .20), (cx + w * .10, h * .045),      # signature flick
               (cx + w * .26, h * .21), (cx + w * .02, h * .24)], fill=C['hair_lt'])
    return shadow(L, blur=5, off=(2, 3), alpha=58)


def draw_face(w, h):
    """The face overlay IS a cut-out: fill it with skin, paint features on top."""
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.ellipse([w * .03, h * .02, w * .97, h * .98], fill=C['skin'])
    er = w * .145
    ey = h * .46
    for sx in (-1, 1):
        ex = w * .5 + sx * w * .195
        d.ellipse([ex - er, ey - er * 1.10, ex + er, ey + er * 1.10], fill=C['eye_white'])
        d.ellipse([ex - er * .78, ey - er * .72, ex + er * .78, ey + er * .92], fill=C['iris'])
        d.ellipse([ex - er * .44, ey - er * .34, ex + er * .44, ey + er * .60], fill=C['pupil'])
        d.ellipse([ex - er * .60, ey - er * .70, ex - er * .20, ey - er * .28], fill=C['white'])
        by = ey - er * 1.34
        d.line([(ex - er * .86, by + er * .10), (ex + er * .86, by - er * .12)],
               fill=C['hair_dk'], width=int(w * .026))
        d.ellipse([ex - er * 1.02, ey + er * 1.04, ex + er * .42, ey + er * 1.52],
                  fill=C['cheek'])
    my = h * .74
    d.chord([w * .43, my - h * .075, w * .57, my + h * .075], 0, 180, fill=C['mouth'])
    d.chord([w * .463, my + h * .012, w * .537, my + h * .070], 0, 180, fill=C['tongue'])
    d.ellipse([w * .5 - w * .016, h * .605, w * .5 + w * .016, h * .632], fill=C['skin_dk'])
    return shadow(L, blur=4, off=(2, 2), alpha=55)


def draw_coat(w, h):
    """Winter coat: sleeveless torso (the separate arm nodes provide sleeves)."""
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.polygon([(w * .34, h * .04), (w * .66, h * .04), (w * .72, h * .30),
               (w * .78, h * .58), (w * .86, h * .96), (w * .14, h * .96),
               (w * .22, h * .58), (w * .28, h * .30)], fill=C['coat'])
    d.polygon([(w * .34, h * .04), (w * .48, h * .04), (w * .50, h * .24),
               (w * .38, h * .19)], fill=C['coat_dk'])          # collar / lapel
    d.polygon([(w * .66, h * .04), (w * .52, h * .04), (w * .50, h * .24),
               (w * .62, h * .19)], fill=C['coat_dk'])
    d.rectangle([w * .492, h * .22, w * .508, h * .95], fill=C['coat_dk'])
    for i in range(3):
        yy = h * (.34 + i * .18)
        d.ellipse([w * .56 - 10, yy - 10, w * .56 + 10, yy + 10], fill=C['scarf'])
    d.rectangle([w * .14, h * .925, w * .86, h * .96], fill=C['coat_dk'])
    for i in range(3):                                            # pocket ticks
        d.line([(w * (.26 + i * .02), h * .70), (w * (.34 + i * .02), h * .70)],
               fill=C['coat_dk'], width=5)
    return shadow(L)


def draw_tunic(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.polygon([(w * .36, h * .03), (w * .64, h * .03), (w * .70, h * .30),
               (w * .76, h * .56), (w * .84, h * .97), (w * .16, h * .97),
               (w * .24, h * .56), (w * .30, h * .30)], fill=C['tunic'])
    d.polygon([(w * .36, h * .03), (w * .64, h * .03), (w * .50, h * .24)], fill=C['tunic_dk'])
    d.rectangle([w * .16, h * .935, w * .84, h * .97], fill=C['tunic_dk'])
    for i in range(5):
        d.line([(w * (.31 + i * .095), h * .28), (w * (.27 + i * .095), h * .92)],
               fill=(166, 186, 142), width=4)
    return shadow(L)


def draw_robe(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.polygon([(w * .34, h * .04), (w * .66, h * .04), (w * .71, h * .28),
               (w * .79, h * .60), (w * .88, h * .97), (w * .12, h * .97),
               (w * .21, h * .60), (w * .29, h * .28)], fill=C['robe'])
    d.polygon([(w * .34, h * .04), (w * .66, h * .04), (w * .56, h * .26),
               (w * .44, h * .26)], fill=C['robe_dk'])                 # hood
    d.rectangle([w * .492, h * .26, w * .508, h * .96], fill=C['robe_dk'])
    d.rectangle([w * .14, h * .47, w * .86, h * .51], fill=C['wood'])  # belt
    d.regular_polygon((int(w * .5), int(h * .49), int(w * .040)), 4, fill=C['wood_dk'])
    for i in range(4):
        yy = h * (.60 + i * .09)
        d.line([(w * .24, yy), (w * .30, yy)], fill=C['robe_dk'], width=4)
        d.line([(w * .70, yy), (w * .76, yy)], fill=C['robe_dk'], width=4)
    return shadow(L)


def draw_hat(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.polygon([(w * .06, h * .74), (w * .12, h * .30), (w * .32, h * .09),
               (w * .60, h * .05), (w * .86, h * .21), (w * .94, h * .74)], fill=C['hat'])
    for i in range(9):
        x = w * (.13 + i * .092)
        d.line([(x, h * .22), (x - 7, h * .70)], fill=C['hat_dk'], width=6)
    d.rounded_rectangle([w * .02, h * .64, w * .98, h * .88], radius=26, fill=C['hat_band'])
    for i in range(10):
        d.line([(w * (.05 + i * .10), h * .68), (w * (.05 + i * .10), h * .84)],
               fill=C['hat'], width=4)
    d.ellipse([w * .36, -h * .07, w * .64, h * .19], fill=C['pom'])
    return shadow(L)


def draw_scarf(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.rounded_rectangle([w * .02, h * .08, w * .98, h * .60], radius=22, fill=C['scarf'])
    d.polygon([(w * .58, h * .52), (w * .80, h * .52), (w * .87, h * .97),
               (w * .65, h * .97)], fill=C['scarf'])
    for i in range(6):
        x = w * (.07 + i * .155)
        d.line([(x, h * .14), (x, h * .55)], fill=C['scarf_dk'], width=5)
    for i in range(4):
        x = w * (.66 + i * .055)
        d.line([(x, h * .62), (x, h * .93)], fill=C['scarf_dk'], width=3)
    return shadow(L)


def draw_stripe_top(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.polygon([(w * .30, h * .02), (w * .70, h * .02), (w * .78, h * .44),
               (w * .74, h * .98), (w * .26, h * .98), (w * .22, h * .44)], fill=C['stripe'])
    for i in range(4):
        y = h * (.16 + i * .21)
        d.line([(w * .245, y), (w * .755, y)], fill=(126, 96, 92), width=9)
    return shadow(L)


def draw_shorts(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.polygon([(w * .10, h * .04), (w * .90, h * .04), (w * .87, h * .98),
               (w * .57, h * .98), (w * .50, h * .42), (w * .43, h * .98),
               (w * .13, h * .98)], fill=C['shorts'])
    d.rectangle([w * .10, h * .04, w * .90, h * .16], fill=C['shorts_dk'])
    return shadow(L)


def draw_mouth(w, h):
    """A cut-paper mouth - the tiny 'Front_Smile' pieces in the spec."""
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.chord([w * .06, h * .10, w * .94, h * .95], 0, 180, fill=C['mouth'])
    d.chord([w * .26, h * .52, w * .74, h * .92], 0, 180, fill=C['tongue'])
    return shadow(L, blur=3, off=(1, 2), alpha=50)


def draw_arm(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.rounded_rectangle([w * .27, h * .015, w * .73, h * .985], radius=w * .23, fill=C['skin'])
    d.rounded_rectangle([w * .27, h * .74, w * .73, h * .985], radius=w * .16, fill=C['skin_dk'])
    d.ellipse([w * .30, h * .015, w * .70, h * .10], fill=C['skin_dk'])   # shoulder seam
    return shadow(L, blur=4)


def draw_leg(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.rounded_rectangle([w * .24, h * .01, w * .76, h * .99], radius=w * .24, fill=C['skin'])
    return shadow(L, blur=4)


def draw_hand(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.ellipse([w * .12, h * .16, w * .90, h * .84], fill=C['skin'])
    d.ellipse([w * .10, h * .34, w * .40, h * .70], fill=C['skin_dk'])
    return shadow(L, blur=3)


def draw_shoe(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.rounded_rectangle([w * .08, h * .16, w * .94, h * .84], radius=w * .22, fill=C['brown_dk'])
    d.rounded_rectangle([w * .06, h * .58, w * .96, h * .92], radius=w * .14, fill=C['boot'])
    return shadow(L, blur=3)


def draw_stick(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.rounded_rectangle([w * .26, 0, w * .74, h], radius=6, fill=C['wood'])
    d.rectangle([w * .26, 0, w * .40, h], fill=C['wood_dk'])
    return shadow(L, blur=3, off=(2, 2), alpha=48)


def draw_board(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.ellipse([w * .01, h * .10, w * .99, h * .93], fill=C['board'])
    d.polygon([(w * .12, h * .46), (w * .88, h * .46), (w * .84, h * .62),
               (w * .16, h * .62)], fill=C['board_dk'])
    d.ellipse([w * .05, h * .18, w * .95, h * .55], fill=C['board'])
    return shadow(L)


def draw_wave(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    pts = [(0, h)]
    n = 5
    for i in range(n):
        x0 = w * i / n; x1 = w * (i + 1) / n
        pts += [(x0 + (x1 - x0) * .5, h * .10), (x1, h * .55)]
    pts += [(w, h)]
    d.polygon(pts, fill=C['water'])
    for i in range(n):
        x0 = w * i / n
        d.arc([x0, h * .06, x0 + w / n, h * .80], 200, 340, fill=(228, 241, 248), width=8)
    return shadow(L)


def draw_wheel(w, h):
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    cx, cy, r = w * .5, h * .5, min(w, h) * .455
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(74, 62, 58), width=16)
    d.ellipse([cx - r * .92, cy - r * .92, cx + r * .92, cy + r * .92],
              outline=(198, 198, 192), width=7)
    for i in range(12):
        a = i * math.pi / 6
        d.line([(cx, cy), (cx + math.cos(a) * r * .90, cy + math.sin(a) * r * .90)],
               fill=(152, 150, 146), width=5)
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=(94, 90, 86))
    return shadow(L, blur=4, alpha=58)


def draw_prop(w, h):
    """A branch with leaves - the Fall prop."""
    L = new_layer(w, h); d = ImageDraw.Draw(L)
    d.rounded_rectangle([w * .30, h * .06, w * .44, h * .99], radius=8, fill=C['wood'])
    d.polygon([(w * .37, h * .34), (w * .95, h * .22), (w * .98, h * .30),
               (w * .40, h * .42)], fill=C['wood'])
    d.polygon([(w * .37, h * .56), (w * .06, h * .44), (w * .03, h * .52),
               (w * .37, h * .64)], fill=C['wood_dk'])
    for (px, py, s) in ((.62, .17, 1.0), (.80, .22, .85), (.16, .40, .9), (.30, .46, .75)):
        ex, ey = w * px, h * py
        d.polygon([(ex, ey), (ex + w * .10, ey - h * .05 * s), (ex + w * .16, ey + h * .01 * s),
                   (ex + w * .08, ey + h * .06 * s)], fill=C['leaf'])
    return shadow(L)


# ------------------------------------------------------- shelf packing
PARTS = [
    ('head', 368, 368, draw_head), ('hair', 400, 400, draw_hair),
    ('face', 264, 264, draw_face), ('hat', 300, 300, draw_hat),
    ('scarf', 300, 140, draw_scarf), ('coat', 540, 560, draw_coat),
    ('tunic', 520, 540, draw_tunic), ('robe', 540, 600, draw_robe),
    ('stripe_top', 320, 150, draw_stripe_top), ('shorts', 320, 260, draw_shorts),
    ('arm', 180, 540, draw_arm), ('leg', 150, 540, draw_leg),
    ('hand', 120, 120, draw_hand), ('shoe', 150, 115, draw_shoe),
    ('mouth', 130, 84, draw_mouth),
    ('stick', 56, 980, draw_stick), ('board', 520, 170, draw_board),
    ('wave', 620, 200, draw_wave), ('wheel', 420, 420, draw_wheel),
    ('prop', 260, 560, draw_prop),
]


def pack():
    """Shelf pack, tallest-first, into SHEET x SHEET with PAD gutters."""
    order = sorted(PARTS, key=lambda p: -p[2])
    rects, x, y, row_h = {}, PAD, PAD, 0
    for name, w, h, _ in order:
        if x + w + PAD > SHEET:
            x, y, row_h = PAD, y + row_h + PAD, 0
        if y + h + PAD > SHEET:
            raise SystemExit('atlas overflow at %s' % name)
        rects[name] = (x, y, x + w, y + h)
        x += w + PAD
        row_h = max(row_h, h)
    return rects


RECTS = pack()
DRAW = {p[0]: p[3] for p in PARTS}


def rect(name):
    return RECTS[name]


def build(out='/tmp/gen/atlas.png'):
    sheet = Image.new('RGBA', (SHEET, SHEET), (0, 0, 0, 0))
    sheet.alpha_composite(Image.new('RGBA', (SHEET, SHEET), (0, 0, 0, 0)))
    for name, (x0, y0, x1, y1) in RECTS.items():
        w, h = x1 - x0, y1 - y0
        layer = DRAW[name](w, h)
        assert layer.size == (w, h), (name, layer.size, (w, h))
        sheet.alpha_composite(layer, (x0, y0))
    # paint as a white sheet so the paper edge shadow is not lost against alpha
    # composite onto an OPAQUE sheet: a transparent background turns the baked
    # drop shadow into a black rim once the image is flattened to RGB
    bg = Image.new('RGBA', (SHEET, SHEET), (247, 244, 238, 255))
    out_img = Image.alpha_composite(bg, sheet)
    out_img.convert('RGB').save(out, quality=95)
    return out_img


if __name__ == '__main__':
    import os, json
    img = build()
    import numpy as np
    from PIL import Image as I
    a = np.asarray(img.convert('RGB'))
    prev = I.fromarray(a).resize((1024, 1024), I.LANCZOS)
    prev.save('/tmp/gen/atlas_preview.png')
    json.dump(RECTS, open('/tmp/gen/rects.json', 'w'), indent=1)
    os.makedirs('/tmp/gen/masks', exist_ok=True)
    for name in RECTS:
        x0, y0, x1, y1 = RECTS[name]
        # alpha of the drawn layer, not of the flattened sheet (sheet has a shadow)
        layer = DRAW[name](x1 - x0, y1 - y0)
        layer = DRAW[name](x1 - x0, y1 - y0)
        layer.split()[3].save('/tmp/gen/masks/%s.png' % name)
    print('atlas ->', len(RECTS), 'parts,', os.path.getsize('/tmp/gen/atlas.png'), 'bytes')
