# Turn a sprite drawn on a flat key colour into a transparent PNG (Gemini cannot draw a
# transparent background). Flood-fills from the image border, so an area of the key colour
# inside the sprite is kept; then removes the key-coloured fringe on the sprite's outline.
# Run harden_alpha.py on the result as usual.
# Usage: uv run --with pillow python3 design/tools/chroma_key.py <in.png>... --out <dir>
#        [--key #FF00FF] [--tolerance 80]
# Without --key, the colour is read from the four corners (they must agree).
import os, sys
from collections import deque
from PIL import Image

args = sys.argv[1:]
def opt(name, default):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
out = opt("--out", None); key_hex = opt("--key", None); tol = int(opt("--tolerance", "80"))
if not out or not args:
    raise SystemExit(__doc__ or "usage: chroma_key.py <in.png>... --out <dir> [--key #RRGGBB] [--tolerance N]")
os.makedirs(out, exist_ok=True)

def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a[:3], b[:3])) ** 0.5

for fn in args:
    im = Image.open(fn).convert("RGBA")
    w, h = im.size; px = im.load()
    if key_hex:
        k = key_hex.lstrip("#"); key = tuple(int(k[i:i + 2], 16) for i in (0, 2, 4))
    else:
        corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
        key = corners[0][:3]
        if any(dist(c, key) > tol for c in corners):
            raise SystemExit(f"{fn}: the corners differ, pass --key with the background colour")
    seen = bytearray(w * h); q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft(); i = y * w + x
        if seen[i] or dist(px[x, y], key) > tol:
            continue
        seen[i] = 1; px[x, y] = (0, 0, 0, 0)
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    # Fringe: opaque pixels next to the removed background that still lean towards the key colour.
    fringe = []
    for y in range(h):
        for x in range(w):
            if seen[y * w + x]:
                continue
            near = any(0 <= x + dx < w and 0 <= y + dy < h and seen[(y + dy) * w + x + dx]
                       for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if near and dist(px[x, y], key) <= tol * 1.6:
                fringe.append((x, y))
    for x, y in fringe:
        px[x, y] = (0, 0, 0, 0)
    removed = sum(seen) + len(fringe)
    im.save(os.path.join(out, os.path.splitext(os.path.basename(fn))[0] + ".png"))
    print(os.path.basename(fn), f"key #{''.join(f'{c:02X}' for c in key)}", f"{removed * 100 // (w * h)}% removed")
