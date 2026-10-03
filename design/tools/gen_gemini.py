# One image request to the Gemini API (generateContent), logged to design/log.jsonl.
# The Gemini counterpart of gen.py: same log format, same per-step budget cap.
# Usage (from the project root):
#   python3 design/tools/gen_gemini.py --step round1 --out design/round1/01-home-light.png \
#       --prompt design/prompts/r1-01-home-light.txt --aspect 2:3 --image-size 2K \
#       --ref design/refs/ref-1.png --ref design/refs/ref-2.png --cap 0.50
#   python3 design/tools/gen_gemini.py --list-models    # image models this key can use
# The key comes from the GEMINI_API_KEY environment variable or design/.env, and is sent on
# curl's stdin, never on the command line. In a cloud environment it can instead be an API
# credential (header x-goog-api-key, host generativelanguage.googleapis.com) that the proxy
# adds outside the session; then there is no variable and the script sends no key itself.
# Gemini cannot draw a transparent background: ask for a flat key colour in the prompt and
# run chroma_key.py on the result.
import argparse, base64, fcntl, json, mimetypes, os, subprocess, tempfile, time

DEFAULT_MODEL = "gemini-3-pro-image-preview"
API = os.environ.get("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
DESIGN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOG = os.path.join(DESIGN, "log.jsonl")
LOCK = os.path.join(DESIGN, ".gen.lock")
PENDING = os.path.join(DESIGN, ".gen.pending")
HEADROOM = 0.25  # $ reserved per in-flight request (a 4K Pro image is about $0.24)
ASPECTS = {"1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"}
# $ per million tokens. Image output is billed as tokens: a 1K/2K image is about 1120 tokens,
# a 4K one about 2000. Check the current prices on the first run and correct this table.
PRICE = {
    "gemini-3-pro-image-preview": dict(input=2.0, output_image=120.0, output_text=12.0),
    "gemini-3.1-flash-image-preview": dict(input=0.5, output_image=60.0, output_text=3.0),
}
FALLBACK_PRICE = PRICE[DEFAULT_MODEL]  # unknown model: assume the dearest, so the cap holds

ap = argparse.ArgumentParser()
ap.add_argument("--list-models", action="store_true", help="list the image models for this key and exit")
ap.add_argument("--step"); ap.add_argument("--out")
ap.add_argument("--prompt", help="file with the full prompt text")
ap.add_argument("--model", default=DEFAULT_MODEL)
ap.add_argument("--aspect", default="2:3", help="aspect ratio, e.g. 2:3 screens, 1:1 assets, 16:9 sheets")
ap.add_argument("--image-size", default="2K", help="1K, 2K or 4K; empty to let the model choose")
ap.add_argument("--ref", action="append", default=[], help="reference image, repeatable, in order")
ap.add_argument("--cap", type=float, help="approved budget for this step in $")
ap.add_argument("--secrets", default=os.path.join(DESIGN, ".env"))
a = ap.parse_args()

key = os.environ.get("GEMINI_API_KEY")
if not key and os.path.exists(a.secrets):
    for line in open(a.secrets):
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
if key:
    cfg = f'header = "x-goog-api-key: {key}"\n'  # via stdin, so the key is not in argv
else:
    # A cloud environment can hold the key as an API credential: the agent proxy adds the
    # header to requests for generativelanguage.googleapis.com and the session never sees it.
    cfg = ""
    print("note: no GEMINI_API_KEY here; relying on an API credential added by the environment's proxy")


def curl(url, body_file=None):
    cmd = ["curl", "-s", "--max-time", "900", "-K", "-", url]
    if body_file:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", f"@{body_file}"]
    p = subprocess.run(cmd, input=cfg, capture_output=True, text=True)
    try:
        return json.loads(p.stdout)
    except Exception:
        return {"raw": p.stdout[:500], "curl_rc": p.returncode}


if a.list_models:
    r = curl(f"{API}/models?pageSize=1000")
    if "models" not in r:
        raise SystemExit(json.dumps(r.get("error") or r)[:500])
    for m in r["models"]:
        name = m["name"].split("/", 1)[-1]
        if "image" in name or "imagen" in name:
            print(name, "-", m.get("displayName", ""))
    raise SystemExit(0)

for f in ("step", "out", "prompt", "cap"):
    if getattr(a, f) is None:
        ap.error(f"--{f} is required")
assert a.aspect in ASPECTS, f"aspect must be one of {sorted(ASPECTS)}"
assert a.image_size in ("", "1K", "2K", "4K"), "image size must be 1K, 2K or 4K (capital K)"
assert not os.path.exists(a.out), f"{a.out} exists; rename it (*-v1-rejected.png) first"
prompt = open(a.prompt).read().strip()


def cost(u):
    """Cost from usageMetadata; output split into image and text tokens when reported."""
    p = PRICE.get(a.model, FALLBACK_PRICE)
    inp = u.get("promptTokenCount", 0)
    details = {d.get("modality"): d.get("tokenCount", 0) for d in u.get("candidatesTokensDetails", [])}
    out_img = details.get("IMAGE", u.get("candidatesTokenCount", 0) if not details else 0)
    out_txt = details.get("TEXT", 0) + u.get("thoughtsTokenCount", 0)
    return (inp * p["input"] + out_img * p["output_image"] + out_txt * p["output_text"]) / 1e6


def read_log():
    return [json.loads(l) for l in open(LOG)] if os.path.exists(LOG) else []


lock = open(LOCK, "a+"); fcntl.flock(lock, fcntl.LOCK_EX)
spent = sum(e.get("cost", 0) for e in read_log() if e["step"] == a.step)
pend = open(PENDING).read().split() if os.path.exists(PENDING) else []
if spent + HEADROOM * (len(pend) + 1) > a.cap:
    raise SystemExit(f"CAP STOP: step {a.step} has ${spent:.4f} spent, {len(pend)} in flight, cap ${a.cap}")
open(PENDING, "a").write(a.out + "\n"); fcntl.flock(lock, fcntl.LOCK_UN)

# The prompt first, then the references in the order the prompt describes them.
parts = [{"text": prompt}]
for r in a.ref:
    mime = mimetypes.guess_type(r)[0] or "image/png"
    parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(open(r, "rb").read()).decode()}})
image_config = {"aspectRatio": a.aspect}
if a.image_size:
    image_config["imageSize"] = a.image_size
body = {"contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": image_config}}

started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()); t0 = time.time()
with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
    json.dump(body, tf)
try:
    r = curl(f"{API}/models/{a.model}:generateContent", tf.name)
finally:
    os.unlink(tf.name)
wall = time.time() - t0

u = r.get("usageMetadata")
image, mime, note = None, None, None
for c in r.get("candidates", []):
    for p in c.get("content", {}).get("parts", []):
        d = p.get("inlineData") or p.get("inline_data")
        if d and not image:
            image = base64.b64decode(d["data"])
            mime = d.get("mimeType") or d.get("mime_type")
        elif p.get("text"):
            note = (note or "") + p["text"][:300]
    if not image and c.get("finishReason") not in (None, "STOP"):
        note = f"finishReason {c.get('finishReason')}"
if not image and not note:
    note = json.dumps(r.get("promptFeedback") or r.get("error") or r.get("raw"))[:500]

entry = dict(step=a.step, out=a.out, started=started, model=a.model, aspect=a.aspect,
             image_size=a.image_size, refs=a.ref, prompt_file=a.prompt, prompt_chars=len(prompt),
             mime=mime, wall_s=round(wall, 1), usage=u, cost=round(cost(u), 4) if u else 0.0,
             error=None if image else note)
if image and mime and mime != "image/png":
    print(f"note: the model returned {mime}; convert it before treating it as PNG")
if image:
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    open(a.out, "wb").write(image)
fcntl.flock(lock, fcntl.LOCK_EX)
with open(LOG, "a") as f:
    f.write(json.dumps(entry) + "\n")
pend = open(PENDING).read().split(); pend.remove(a.out)
open(PENDING, "w").write("".join(x + "\n" for x in pend)); fcntl.flock(lock, fcntl.LOCK_UN)
print(json.dumps({k: entry[k] for k in ("out", "wall_s", "cost", "error")}))
