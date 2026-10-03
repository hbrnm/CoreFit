# Contact sheet of cleaned sprites on the light surface and the dark surface, with names.
# Usage: uv run --with pillow python3 design/tools/contact_sheet.py <out.png> <cols> <cell_px> <file>...
# Set LIGHT/DARK to the brief's surface colours.
import sys, os
from PIL import Image, ImageDraw, ImageFont

LIGHT, LIGHT_INK = (247, 243, 234), (42, 42, 40)
DARK, DARK_INK = (31, 33, 32), (240, 236, 226)
out, cols, cell = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); files = sys.argv[4:]
try:
    font = ImageFont.truetype("DejaVuSans-Bold.ttf", max(14, cell // 11))
except OSError:
    font = ImageFont.load_default(size=max(14, cell // 11))
rows = (len(files) + cols - 1) // cols; lab = cell // 6; pad = cell // 12
pw, ph = cols * (cell + pad) + pad, rows * (cell + lab + pad) + pad
sheet = Image.new("RGBA", (pw, ph * 2), (0, 0, 0, 255))
for k, (bg, fg) in enumerate([(LIGHT, LIGHT_INK), (DARK, DARK_INK)]):
    panel = Image.new("RGBA", (pw, ph), bg + (255,)); d = ImageDraw.Draw(panel)
    for i, fn in enumerate(files):
        im = Image.open(fn).convert("RGBA")
        s = min((cell - 8) / im.width, (cell - 8) / im.height)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.NEAREST)
        x = pad + (i % cols) * (cell + pad); y = pad + (i // cols) * (cell + lab + pad)
        panel.alpha_composite(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        name = os.path.splitext(os.path.basename(fn))[0]
        tw = d.textlength(name, font=font)
        d.text((x + (cell - tw) / 2, y + cell + 4), name, fill=fg, font=font)
    sheet.alpha_composite(panel, (0, k * ph))
sheet.convert("RGB").save(out)   # flattened: safe to attach as a reference
print(out, sheet.size)
