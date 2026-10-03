# crop.py: cut an approved element out of a generated screen to use as an anchor.
# Usage: python3 crop.py <in.png> <left> <top> <right> <bottom> <out.png>
import sys
from PIL import Image
src, l, t, r, b, out = sys.argv[1], *map(int, sys.argv[2:6]), sys.argv[6]
Image.open(src).crop((l, t, r, b)).save(out)
