# One image request to the Images API edits endpoint, logged to design/log.jsonl.
# Usage (from the project root):
#   python3 design/tools/gen.py --step round1 --out design/round1/01-home-light.png \
#       --prompt design/prompts/r1-01-home-light.txt --size 1024x1536 --background opaque \
#       --ref design/refs/ref-1.png --ref design/refs/ref-2.png --cap 0.35
# The cap is per step: the request is refused if logged spend for the step plus
# $0.15 headroom per in-flight request would exceed it.
import argparse, base64, fcntl, json, os, subprocess, time

MODEL = "gpt-image-2.5-sunburst"
URL = "https://api.openai.com/v1/images/edits"
DESIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(DESIGN, "log.jsonl")
LOCK = os.path.join(DESIGN, ".gen.lock")
PENDING = os.path.join(DESIGN, ".gen.pending")
HEADROOM = 0.15
PRICE = dict(text_in=5, image_in=8, image_out=30)  # $ per million tokens; check current prices

ap = argparse.ArgumentParser()
ap.add_argument("--step", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--prompt", required=True, help="file with the full prompt text")
ap.add_argument("--size", default="1024x1536")
ap.add_argument("--background", default="opaque", choices=["opaque", "transparent"])
ap.add_argument("--ref", action="append", default=[], help="reference image, repeatable, in order")
ap.add_argument("--cap", type=float, required=True, help="approved budget for this step in $")
ap.add_argument("--secrets", default=os.path.join(DESIGN, ".env"))
a = ap.parse_args()

w, h = map(int, a.size.split("x"))
assert w % 16 == 0 and h % 16 == 0, "sizes must be multiples of 16"
assert a.ref, "attach at least one reference (the edits endpoint needs an image)"
assert not os.path.exists(a.out), f"{a.out} exists; rename it (*-v1-rejected.png) first"

key = os.environ.get("OPENAI_API_KEY")
if not key and os.path.exists(a.secrets):
    for line in open(a.secrets):
        if line.startswith("OPENAI_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
if not key:
    raise SystemExit("no OPENAI_API_KEY in the environment or the secrets file")
prompt = open(a.prompt).read().strip()

def cost(u):
    d = u.get("input_tokens_details", {})
    return (d.get("text_tokens", 0) * PRICE["text_in"] + d.get("image_tokens", 0) * PRICE["image_in"]
            + u.get("output_tokens", 0) * PRICE["image_out"]) / 1e6

def read_log():
    return [json.loads(l) for l in open(LOG)] if os.path.exists(LOG) else []

lock = open(LOCK, "a+"); fcntl.flock(lock, fcntl.LOCK_EX)
spent = sum(e.get("cost", 0) for e in read_log() if e["step"] == a.step)
pend = open(PENDING).read().split() if os.path.exists(PENDING) else []
if spent + HEADROOM * (len(pend) + 1) > a.cap:
    raise SystemExit(f"CAP STOP: step {a.step} has ${spent:.4f} spent, {len(pend)} in flight, cap ${a.cap}")
open(PENDING, "a").write(a.out + "\n"); fcntl.flock(lock, fcntl.LOCK_UN)

args = []
for k, v in [("model", MODEL), ("prompt", prompt), ("size", a.size), ("quality", "high"),
             ("output_format", "png"), ("n", "1"), ("background", a.background)]:
    args += ["--form-string", f"{k}={v}"]           # never -F for text: it truncates at ';'
for r in a.ref:
    args += ["-F", f"image[]=@{r}"]
cfg = f'header = "Authorization: Bearer {key}"\n'   # via stdin, so the key is not in argv
started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()); t0 = time.time()
p = subprocess.run(["curl", "-s", "--max-time", "900", "-K", "-", URL] + args,
                   input=cfg, capture_output=True, text=True)
wall = time.time() - t0
try:
    r = json.loads(p.stdout)
except Exception:
    r = {"raw": p.stdout[:500], "curl_rc": p.returncode}
u = r.get("usage")
entry = dict(step=a.step, out=a.out, started=started, model=MODEL, size=a.size,
             background=a.background, refs=a.ref, prompt_file=a.prompt, prompt_chars=len(prompt),
             wall_s=round(wall, 1), usage=u, cost=round(cost(u), 4) if u else 0.0,
             error=r.get("error") or r.get("raw"))
if "data" in r:
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    open(a.out, "wb").write(base64.b64decode(r["data"][0]["b64_json"]))
fcntl.flock(lock, fcntl.LOCK_EX)
with open(LOG, "a") as f:
    f.write(json.dumps(entry) + "\n")
pend = open(PENDING).read().split(); pend.remove(a.out)
open(PENDING, "w").write("".join(x + "\n" for x in pend)); fcntl.flock(lock, fcntl.LOCK_UN)
print(json.dumps({k: entry[k] for k in ("out", "wall_s", "cost", "error")}))
