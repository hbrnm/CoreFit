# Harden the alpha of generated transparent sprites: alpha >= 128 -> 255, else 0; fully
# transparent pixels get RGB 0 (no hidden colour that bleeds when scaled or reused);
# trim to content with 1 px padding.
# Usage: uv run --with pillow python3 design/tools/harden_alpha.py <in.png>... --out <dir>
import sys, os
from PIL import Image

args = sys.argv[1:]
out = args[args.index("--out") + 1]
files = [f for f in args if f not in ("--out", out)]
os.makedirs(out, exist_ok=True)
for fn in files:
    im = Image.open(fn).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v >= 128 else 0)
    clear = Image.new("RGBA", im.size, (0, 0, 0, 0))
    im = Image.composite(Image.merge("RGBA", (*im.split()[:3], a)), clear, a)
    bb = a.getbbox()
    if bb:
        l, t, r, b = bb
        im = im.crop((max(l - 1, 0), max(t - 1, 0), min(r + 1, im.width), min(b + 1, im.height)))
    im.save(os.path.join(out, os.path.basename(fn)))
    print(os.path.basename(fn), im.size)
