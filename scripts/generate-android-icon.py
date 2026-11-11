"""CardTastic's Android adaptive icon layers, made from the iOS icon's own art.

Android draws a 108dp layer and shows the middle 72dp of it through the launcher's mask, so the
visible part is two-thirds of each layer. The foreground is the splash art (the four aces, the
same pixels as on the iOS icon) at two-thirds scale, and the background is the iOS icon's felt
gradient at the same scale, so the visible icon is the iOS icon's composition. The monochrome
layer (Android 13+ themed icons) is the four cards as white silhouettes with the ink knocked out.

Run from the repo root after the icon or splash art changes (Pillow through uv, nothing to install):
    uv run --with pillow python scripts/generate-android-icon.py [preview.png]
It writes assets/images/android-icon-{foreground,background,monochrome}.png, and with a path, a
preview of the launcher's masks and the themed icons beside the iOS icon.
"""

import math
import random
import sys

from PIL import Image, ImageDraw

root = '.'
out = 'assets/images'
preview = sys.argv[1] if len(sys.argv) > 1 else None
W = 1024
C = W / 2
SCALE_TO_IOS = 1.5  # one px of the layer is 1.5 px of the 1024px iOS icon (108dp layer, 72dp visible)

# The iOS felt, measured off icon-dark.png: radial and symmetric, color = C0 + (C1 - C0) * d^2.5,
# d = distance from the center over the half-diagonal.
C0 = (30.2, 92.2, 71.0)
C1 = (18.4, 64.0, 48.8)
HALF_DIAGONAL = C * math.sqrt(2)

random.seed(7)
bg = Image.new('RGB', (W, W))
px = bg.load()
for y in range(W):
    for x in range(W):
        d = min(1.0, math.hypot(x + 0.5 - C, y + 0.5 - C) * SCALE_TO_IOS / HALF_DIAGONAL)
        t = d ** 2.5
        px[x, y] = tuple(int(min(255, max(0, C0[i] + (C1[i] - C0[i]) * t + random.random() - 0.5)) + 0.5) for i in range(3))
bg.save(f'{out}/android-icon-background.png', optimize=True)

art = Image.open(f'{root}/assets/images/splash-dark.png').convert('RGBA')
SIZE = 682  # two-thirds of 1024, even so the art stays centered at 512
small = art.convert('RGBa').resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA')
fg = Image.new('RGBA', (W, W), (0, 0, 0, 0))
fg.paste(small, ((W - SIZE) // 2, (W - SIZE) // 2))
fg.save(f'{out}/android-icon-foreground.png', optimize=True)

# Monochrome: white where the cards are white, the outlines and the ink knocked out, so the four
# cards read as four shapes with their pips cut through. Alpha follows the darkest channel, so
# red and black ink both drop out and antialiased edges stay soft.
mono = Image.new('RGBA', (W, W), (255, 255, 255, 0))
fp, mp = fg.load(), mono.load()
for y in range(W):
    for x in range(W):
        r, g, b, a = fp[x, y]
        if a:
            white = min(1.0, max(0.0, (min(r, g, b) / 255 - 0.45) / 0.5))
            mp[x, y] = (255, 255, 255, round(a * white))
mono.save(f'{out}/android-icon-monochrome.png', optimize=True)

# Previews: the launcher's masks over the visible 72dp, and themed (monochrome) icons dark and light.
VIS = round(W * 72 / 108)
OFF = (W - VIS) // 2


def masked(mask_draw, layer):
    mask = Image.new('L', (W, W), 0)
    mask_draw(ImageDraw.Draw(mask))
    return Image.composite(layer, Image.new('RGBA', (W, W), (0, 0, 0, 0)), mask).crop((OFF, OFF, OFF + VIS, OFF + VIS))


full = bg.convert('RGBA')
full.alpha_composite(fg)
box = (OFF, OFF, OFF + VIS - 1, OFF + VIS - 1)
shapes = [
    lambda d: d.ellipse(box, fill=255),
    lambda d: d.rounded_rectangle(box, radius=round(VIS * 0.3), fill=255),
    lambda d: d.rounded_rectangle(box, radius=round(VIS * 0.12), fill=255),
]


def themed(back, ink):
    layer = Image.new('RGBA', (W, W), back + (255,))
    tint = Image.new('RGBA', (W, W), ink + (255,))
    tint.putalpha(mono.getchannel('A'))
    layer.alpha_composite(tint)
    return layer


tiles = [masked(s, full) for s in shapes] + [masked(shapes[0], themed((32, 48, 40), (196, 236, 214))), masked(shapes[0], themed((210, 234, 220), (20, 60, 42)))]
T = 220
GAP = 30
sheet = Image.new('RGBA', (len(tiles) * (T + GAP) + GAP, T + 2 * GAP), (245, 245, 245, 255))
dark = Image.new('RGBA', (sheet.width, sheet.height // 2), (24, 24, 24, 255))
for i, t in enumerate(tiles):
    sheet.alpha_composite(t.resize((T, T), Image.LANCZOS), (GAP + i * (T + GAP), GAP))
ios = Image.open(f'{root}/assets/images/icon-dark.png').convert('RGBA').resize((T, T), Image.LANCZOS)
ios_mask = Image.new('L', (T, T), 0)
ImageDraw.Draw(ios_mask).rounded_rectangle((0, 0, T - 1, T - 1), radius=round(T * 0.225), fill=255)
row = Image.new('RGBA', (sheet.width + T + GAP, sheet.height), (245, 245, 245, 255))
row.paste(Image.composite(ios, Image.new('RGBA', (T, T), (245, 245, 245, 255)), ios_mask), (GAP, GAP))
row.alpha_composite(sheet, (T + GAP, 0))
if preview:
    row.convert('RGB').save(preview)
print('farthest monochrome/foreground pixel from center',
      round(max(math.hypot(x + 0.5 - C, y + 0.5 - C) for y in range(0, W, 2) for x in range(0, W, 2) if fp[x, y][3] > 8), 1),
      'safe radius', round(W * 33 / 108, 1))
