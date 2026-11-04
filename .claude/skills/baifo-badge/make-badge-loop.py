"""Renders baifo-badge.webm: a round soft 3D badge where the goat wiggles and the rest stays still. Needs Pillow and ffmpeg."""
import math
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = Path(__file__).parent
BRAND = HERE / '../../../public/brand'
FPS, SECONDS = 24, 2  # every motion does whole cycles in this time, so the loop is seamless
CANVAS, CIRCLE = 1200, 1000
OUTPUT_SIZE = 480
CREAM, CORAL, TEAL = (250, 245, 235), (231, 118, 88), (38, 182, 172)
NAVY_LIGHT, NAVY_DARK = (58, 82, 94), (22, 33, 40)
SYMBOL_HEIGHT = 590
WAVE_TOP, SUN_LEFT, SUN_BOTTOM = 800, 600, 230  # where the wave and sun sit in symbol.png
CELL = 12


def circle_mask():
    mask = Image.new('L', (CANVAS * 2, CANVAS * 2), 0)
    start = CANVAS - CIRCLE
    ImageDraw.Draw(mask).ellipse((start, start, start + CIRCLE * 2, start + CIRCLE * 2), fill=255)
    return mask.resize((CANVAS, CANVAS), Image.Resampling.LANCZOS)


def soft_circle(mask):
    """Light from the top left, a rim that catches it, a darker edge below: this makes it round."""
    start = (CANVAS - CIRCLE) // 2
    blend = Image.radial_gradient('L').resize((CIRCLE * 2, CIRCLE * 2))
    blend = blend.crop((CIRCLE // 2 + 170, CIRCLE // 2 + 170, CIRCLE // 2 + 170 + CIRCLE, CIRCLE // 2 + 170 + CIRCLE))
    body = Image.composite(Image.new('RGB', (CIRCLE, CIRCLE), NAVY_DARK), Image.new('RGB', (CIRCLE, CIRCLE), NAVY_LIGHT), blend)
    picture = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    picture.paste(body, (start, start))
    picture.putalpha(mask)
    inner = ImageChops.subtract(mask, ImageChops.offset(mask, 10, 12)).filter(ImageFilter.GaussianBlur(8))
    picture.paste((255, 255, 255), (0, 0), inner.point(lambda v: v * 0.5))
    lower = ImageChops.subtract(mask, ImageChops.offset(mask, -12, -16)).filter(ImageFilter.GaussianBlur(14))
    picture.paste((8, 14, 18), (0, 0), lower.point(lambda v: v * 0.6))
    picture.putalpha(mask)
    return picture


def coloured(alpha, colour):
    layer = Image.new('RGBA', alpha.size, colour + (0,))
    layer.putalpha(alpha)
    return layer


def logo_layers():
    """The real logo split up, so the goat can move on its own: cream goat, coral sun, teal wave."""
    alpha = Image.open(BRAND / 'symbol.png').convert('RGBA').getchannel('A')
    width, height = alpha.size
    only = lambda box: (lambda part: (part.paste(alpha.crop(box), box), part)[1])(Image.new('L', alpha.size, 0))
    goat = alpha.copy()
    goat.paste(0, (0, WAVE_TOP, width, height))
    goat.paste(0, (SUN_LEFT, 0, width, SUN_BOTTOM))
    size = (round(width * SYMBOL_HEIGHT / height), SYMBOL_HEIGHT)
    place = ((CANVAS - size[0]) // 2 + 10, (CANVAS - CIRCLE) // 2 + 90)
    layers = []
    for part, colour in ((goat, CREAM), (only((SUN_LEFT, 0, width, SUN_BOTTOM)), CORAL), (only((0, WAVE_TOP, width, height)), TEAL)):
        layer = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        layer.paste(coloured(part.resize(size, Image.Resampling.LANCZOS), colour), place)
        layers.append(layer)
    return layers


def round_stroke(draw, points, thickness, fill):
    radius = thickness / 2
    for x, y in points:
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=fill)


def arc(center_x, center_y, radius_x, radius_y, start, end):
    steps = 240
    angles = (math.radians(start + (end - start) * i / steps) for i in range(steps + 1))
    return [(center_x + radius_x * math.cos(a), center_y - radius_y * math.sin(a)) for a in angles]


def domain_text():
    """'baifo' from the real wordmark; no font matches its round lines, so '.es' is drawn in the same stroke."""
    letters = Image.open(BRAND / 'wordmark.png').convert('RGBA').getchannel('A')
    baseline, x_height, stroke = 173, 106, 27  # measured on wordmark.png
    middle = baseline - x_height / 2
    radius = (x_height - stroke) / 2
    text = Image.new('L', (860, 190), 0)
    dot = Image.new('L', text.size, 0)
    text.paste(letters, (0, 0))
    draw = ImageDraw.Draw(text)
    e_x = 590 + radius
    round_stroke(draw, arc(e_x, middle, radius, radius, 0, 318), stroke, 255)
    round_stroke(draw, [(e_x - radius + (2 * radius) * i / 80, middle) for i in range(81)], stroke, 255)
    s_x, s_radius_x, s_radius_y = e_x + radius + stroke + 42, 27, radius / 2
    round_stroke(draw, arc(s_x, middle - s_radius_y, s_radius_x, s_radius_y, 35, 270), stroke, 255)
    round_stroke(draw, arc(s_x, middle + s_radius_y, s_radius_x, s_radius_y, 90, -145), stroke, 255)
    dot_x = 543
    ImageDraw.Draw(dot).ellipse((dot_x - 17, baseline - 34, dot_x + 17, baseline), fill=255)
    bounds = text.getbbox()
    text, dot = text.crop(bounds), dot.crop(bounds)
    size = (640, round(640 * text.height / text.width))
    layer = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
    place = ((CANVAS - size[0]) // 2, CANVAS // 2 + 340 - size[1])
    layer.paste(coloured(text.resize(size, Image.Resampling.LANCZOS), CREAM), place)
    coral = coloured(dot.resize(size, Image.Resampling.LANCZOS), CORAL)
    layer.alpha_composite(coral, place)
    return layer


def wiggle(cycles, t, delay=0.0):
    return math.sin(2 * math.pi * cycles * t / SECONDS - delay)


def warp_goat(goat, t):
    neck_y = (CANVAS - CIRCLE) // 2 + 90 + SYMBOL_HEIGHT * 0.84
    span = SYMBOL_HEIGHT * 0.84

    def offset(x, y):
        height = min(1.0, max(0.0, (neck_y - y) / span))
        return 16 * wiggle(5, t, 0.9 * height) * height ** 1.4, 6 * wiggle(5, t, 1.5) * height

    mesh = []
    for top in range(0, CANVAS, CELL):
        for left in range(0, CANVAS, CELL):
            quad = []
            for x, y in ((left, top), (left, top + CELL), (left + CELL, top + CELL), (left + CELL, top)):
                dx, dy = offset(x, y)
                quad += [x - dx, y - dy]
            mesh.append(((left, top, left + CELL, top + CELL), quad))
    return goat.transform(goat.size, Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)


mask = circle_mask()
shadow = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
shadow.paste((10, 18, 24, 150), (0, 22), mask)
shadow = shadow.filter(ImageFilter.GaussianBlur(26))
base = Image.alpha_composite(shadow, soft_circle(mask))
goat, sun, wave = logo_layers()
for still in (sun, wave, domain_text()):
    base.alpha_composite(still)

with tempfile.TemporaryDirectory() as folder:
    for n in range(FPS * SECONDS):
        frame = base.copy()
        frame.alpha_composite(warp_goat(goat, n / FPS))
        frame.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS).save(f'{folder}/{n:03}.png')
    subprocess.run(['ffmpeg', '-nostdin', '-loglevel', 'error', '-y', '-framerate', str(FPS), '-i', f'{folder}/%03d.png',
                    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '20', '-b:v', '0', str(HERE / 'baifo-badge.webm')], check=True)
