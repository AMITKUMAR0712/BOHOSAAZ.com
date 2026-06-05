from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
import random

OUT = Path("public/category-art")
OUT.mkdir(parents=True, exist_ok=True)

W, H = 900, 620


def hex_to_rgb(value):
    value = value.strip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient(colors):
    img = Image.new("RGB", (W, H), colors[0])
    pix = img.load()
    c1, c2, c3 = [hex_to_rgb(c) for c in colors]
    for y in range(H):
        for x in range(W):
            t = (x / W * 0.45) + (y / H * 0.55)
            if t < 0.55:
                k = t / 0.55
                c = tuple(lerp(c1[i], c2[i], k) for i in range(3))
            else:
                k = (t - 0.55) / 0.45
                c = tuple(lerp(c2[i], c3[i], k) for i in range(3))
            pix[x, y] = c
    return img.convert("RGBA")


def glow(draw, xy, color):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(xy, fill=color)
    return layer.filter(ImageFilter.GaussianBlur(44))


def add_surface(img):
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((80, 420, 820, 610), radius=52, fill=(255, 248, 237, 92))
    draw.rounded_rectangle((120, 456, 780, 590), radius=44, fill=(126, 75, 42, 26))
    for x in range(110, 800, 44):
        draw.line((x, 470, x + 110, 592), fill=(255, 255, 255, 18), width=2)


def add_noise(img, seed):
    random.seed(seed)
    noise = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(noise)
    for _ in range(1500):
        x = random.randrange(W)
        y = random.randrange(H)
        a = random.randrange(6, 18)
        d.point((x, y), fill=(255, 250, 240, a))
    return Image.alpha_composite(img, noise)


def save(name, colors, painter, seed=1):
    img = gradient(colors)
    img = Image.alpha_composite(img, glow(None, (-120, -120, 360, 330), (255, 221, 166, 120)))
    img = Image.alpha_composite(img, glow(None, (520, 60, 1020, 560), (135, 56, 20, 72)))
    add_surface(img)
    painter(img)
    img = add_noise(img, seed)
    img = img.filter(ImageFilter.UnsharpMask(radius=1.1, percent=112, threshold=3))
    img.convert("RGB").save(OUT / f"{name}.webp", "WEBP", quality=86, method=6)


def draw_glass(draw, x, y, scale=1.0):
    w, h = int(84 * scale), int(150 * scale)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=int(24 * scale), fill=(255, 245, 225, 54), outline=(255, 255, 255, 120), width=3)
    draw.rectangle((x + 8, y + h - 52, x + w - 8, y + h - 12), fill=(169, 80, 30, 84))
    draw.ellipse((x + 8, y + h - 66, x + w - 8, y + h - 26), fill=(214, 142, 63, 80))
    draw.line((x + 12, y + 20, x + w - 12, y + h - 24), fill=(255, 255, 255, 72), width=4)


def bar_tools(img):
    d = ImageDraw.Draw(img)
    draw_glass(d, 255, 246, 1.18)
    draw_glass(d, 455, 270, 0.92)
    d.rounded_rectangle((390, 150, 414, 500), radius=12, fill=(212, 179, 125, 210))
    d.ellipse((360, 126, 444, 204), fill=(228, 199, 148, 230), outline=(255, 248, 225, 150), width=4)
    d.line((585, 170, 430, 500), fill=(230, 203, 161, 220), width=9)
    d.ellipse((570, 142, 624, 196), outline=(241, 218, 178, 230), width=8)
    for x in [252, 335, 458, 542]:
        d.ellipse((x, 458, x + 36, 494), fill=(255, 235, 185, 75))


def copperware(img):
    d = ImageDraw.Draw(img)
    copper = (178, 83, 35, 232)
    gold = (239, 178, 102, 210)
    d.ellipse((245, 385, 510, 530), fill=(113, 48, 24, 72))
    d.rounded_rectangle((290, 170, 500, 475), radius=70, fill=copper, outline=(255, 207, 142, 120), width=5)
    d.ellipse((312, 140, 480, 215), fill=gold, outline=(255, 230, 190, 160), width=5)
    d.rectangle((332, 205, 460, 270), fill=(128, 56, 25, 90))
    d.arc((470, 225, 635, 420), 275, 80, fill=gold, width=16)
    d.rounded_rectangle((545, 268, 665, 462), radius=52, fill=(195, 94, 42, 222), outline=(255, 210, 150, 118), width=5)
    d.ellipse((560, 240, 650, 292), fill=(241, 176, 96, 220), outline=(255, 232, 190, 135), width=4)
    d.line((345, 190, 325, 430), fill=(255, 234, 188, 70), width=8)
    d.line((590, 278, 576, 430), fill=(255, 234, 188, 70), width=6)


def diya(img):
    d = ImageDraw.Draw(img)
    for cx, cy, r in [(330, 350, 94), (505, 385, 78), (625, 330, 62)]:
        d.ellipse((cx - r, cy - r // 2, cx + r, cy + r // 2), fill=(142, 64, 29, 210), outline=(244, 182, 93, 165), width=5)
        d.pieslice((cx - r, cy - r, cx + r, cy + r), 0, 180, fill=(206, 105, 42, 210))
        d.ellipse((cx - 18, cy - r - 40, cx + 18, cy - r + 46), fill=(255, 201, 75, 220))
        d.ellipse((cx - 8, cy - r - 24, cx + 8, cy - r + 26), fill=(255, 246, 184, 245))
    for i in range(30):
        a = i * math.pi / 15
        x = 480 + math.cos(a) * 280
        y = 280 + math.sin(a) * 150
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(255, 220, 142, 115))


def decor(img):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((330, 315, 450, 500), radius=50, fill=(246, 235, 212, 238), outline=(255, 255, 255, 130), width=4)
    d.ellipse((320, 292, 460, 350), fill=(255, 250, 235, 230))
    for ox, color in [(-92, (189, 155, 91, 225)), (-42, (218, 184, 118, 220)), (14, (166, 133, 76, 218))]:
        stem_x = 390 + ox
        d.line((392, 315, stem_x, 160), fill=(145, 105, 54, 180), width=5)
        pts = [(stem_x, 145), (stem_x - 70, 190), (stem_x - 35, 265), (stem_x + 28, 240), (stem_x + 52, 168)]
        d.polygon(pts, fill=color)
        for j in range(8):
            d.line((stem_x, 150, stem_x - 58 + j * 14, 188 + j * 9), fill=(255, 243, 210, 72), width=2)
    d.rounded_rectangle((500, 260, 610, 502), radius=30, fill=(61, 80, 58, 235), outline=(255, 255, 255, 88), width=3)
    d.rounded_rectangle((520, 318, 590, 406), radius=12, fill=(255, 248, 235, 205))
    d.ellipse((638, 360, 735, 505), fill=(240, 218, 188, 210), outline=(255, 255, 255, 112), width=4)


def hamper(img):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((250, 300, 650, 505), radius=42, fill=(143, 75, 41, 218), outline=(244, 194, 128, 140), width=5)
    d.arc((300, 160, 600, 445), 190, 350, fill=(216, 164, 101, 230), width=16)
    for x, h, c in [(300, 140, (235, 194, 129, 230)), (410, 190, (112, 68, 45, 230)), (520, 160, (231, 150, 102, 230))]:
        d.rounded_rectangle((x, 220, x + 88, 415), radius=18, fill=c, outline=(255, 236, 195, 95), width=3)
        d.polygon((x, 220, x + 44, 170, x + 88, 220), fill=(255, 229, 190, 180))
    d.line((250, 375, 650, 375), fill=(255, 232, 190, 125), width=5)
    d.ellipse((424, 346, 476, 398), fill=(255, 230, 175, 190))


def lifestyle(img):
    d = ImageDraw.Draw(img)
    d.ellipse((275, 400, 640, 528), fill=(83, 48, 36, 62))
    d.rounded_rectangle((320, 250, 470, 470), radius=36, fill=(247, 238, 222, 228), outline=(255, 255, 255, 120), width=4)
    d.rounded_rectangle((505, 205, 618, 470), radius=32, fill=(226, 151, 103, 220), outline=(255, 225, 187, 118), width=4)
    d.rectangle((528, 168, 595, 205), fill=(255, 222, 190, 215))
    d.ellipse((345, 288, 445, 386), fill=(255, 255, 250, 210))
    d.rounded_rectangle((360, 380, 430, 455), radius=12, fill=(186, 117, 80, 120))
    for x in [270, 675, 710]:
        d.ellipse((x, 250, x + 58, 308), fill=(255, 224, 182, 85))


def handmade(img):
    d = ImageDraw.Draw(img)
    for i, x in enumerate([270, 390, 510]):
        color = [(186, 96, 58, 230), (222, 166, 91, 228), (113, 87, 66, 225)][i]
        d.rounded_rectangle((x, 220 - i * 20, x + 115, 470), radius=52, fill=color, outline=(255, 232, 186, 115), width=4)
        d.ellipse((x + 12, 195 - i * 20, x + 103, 250 - i * 20), fill=(245, 214, 170, 210))
        d.line((x + 28, 245 - i * 20, x + 94, 440), fill=(255, 240, 205, 58), width=6)
    for x in range(245, 650, 54):
        d.line((x, 492, x + 40, 438), fill=(130, 76, 45, 80), width=5)


def hospitality(img):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((250, 338, 670, 454), radius=52, fill=(236, 220, 190, 230), outline=(255, 255, 255, 140), width=4)
    d.ellipse((220, 300, 700, 420), fill=(255, 245, 225, 120), outline=(255, 255, 255, 130), width=5)
    d.rounded_rectangle((315, 185, 430, 380), radius=26, fill=(139, 80, 45, 225), outline=(255, 224, 176, 125), width=4)
    d.rounded_rectangle((470, 215, 585, 390), radius=26, fill=(196, 115, 56, 225), outline=(255, 224, 176, 125), width=4)
    d.rectangle((340, 250, 405, 315), fill=(255, 242, 218, 190))
    d.rectangle((495, 275, 560, 335), fill=(255, 242, 218, 190))
    d.line((300, 430, 650, 430), fill=(139, 83, 45, 80), width=5)


def default_art(img):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((330, 240, 595, 492), radius=34, fill=(185, 92, 48, 225), outline=(255, 218, 172, 130), width=5)
    d.rectangle((448, 240, 485, 492), fill=(255, 226, 180, 205))
    d.rectangle((330, 348, 595, 386), fill=(255, 226, 180, 205))
    d.polygon((456, 238, 390, 175, 450, 190, 462, 228), fill=(255, 226, 180, 220))
    d.polygon((477, 238, 545, 175, 486, 190, 473, 228), fill=(255, 226, 180, 220))
    for x in [260, 650, 700]:
        d.ellipse((x, 245, x + 54, 299), fill=(255, 225, 180, 82))


save("bar-tools", ["#f4ddbf", "#b66a38", "#3c2119"], bar_tools, 11)
save("copperware", ["#f8e2bf", "#c86a31", "#552719"], copperware, 12)
save("festive-diya", ["#fff0c8", "#c35b2e", "#4a1715"], diya, 13)
save("home-decor", ["#f1e6d2", "#d3b28a", "#5f4030"], decor, 14)
save("gift-hampers", ["#f6dfbd", "#b46d43", "#4a241b"], hamper, 15)
save("lifestyle", ["#f7e9dd", "#d9a483", "#4c3029"], lifestyle, 16)
save("handmade", ["#f7dfba", "#bd7545", "#513122"], handmade, 17)
save("hospitality", ["#f2dfbd", "#b9854f", "#3f2c24"], hospitality, 18)
save("default-gift", ["#f7e2c6", "#c98357", "#4c2822"], default_art, 19)

print("Generated category WebP art in public/category-art")
