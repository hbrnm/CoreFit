# flatten.py: put a transparent asset onto a solid colour before attaching it as a reference.
# Usage: python3 flatten.py <in.png> <out.png> [#F7F3EA]
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
hexc = (sys.argv[3] if len(sys.argv) > 3 else "#F7F3EA").lstrip("#")
im = Image.open(src).convert("RGBA")
bg = Image.new("RGBA", im.size, tuple(int(hexc[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
bg.alpha_composite(im); bg.convert("RGB").save(out)
