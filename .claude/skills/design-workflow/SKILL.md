---
name: design-workflow
description: Design an app or web UI with an image model (Google Gemini image models, or OpenAI's gpt-image-2.5-sunburst) from the project plan and 2-4 reference screenshots with notes, then build the UI from the images. Use when the user wants to design or redesign screens, icons, a logo or a mascot.
---

# Design workflow: UI design with an image model (instructions for Claude Code)

You are Claude Code, working in the user's project. This file tells you how to design the
project's user interface (an app, a web page, a game UI) together with the user, using
OpenAI's image model `gpt-image-2.5-sunburst`, and then build the UI from the resulting
images. Read the whole file before you start, then guide the user through it step by step.

The user should stay mostly hands-off. What they give you is small: an API key, two to four
reference screenshots with a few lines of notes each, a review after each round, and
approval of each round's budget. Everything else is your job: you know the project, so you
write the brief, the prompts, the scripts, the critique and, at the end, the code.

The running example is **Sprouty**, a fictional plant-care app: users add houseplants with
their species, read care instructions, follow a watering schedule, and are cheered on by a
pixel-art mascot, a terracotta pot with two seedling leaves and a face. In that example the
whole design took 25 minutes from the reference notes to the final screens (11 of them the
user's two reviews) and $2.01 for 28 images (round 1 and round 2).

## Image provider: Gemini or OpenAI

The method works with either provider; the steps below use OpenAI's terms (pixel sizes,
`background=transparent`, `gen.py`). **Ask the user which one they have a key for**, and if
it is Gemini, translate as you go:

| In the steps | OpenAI | Gemini |
|---|---|---|
| Key | `OPENAI_API_KEY` | `GEMINI_API_KEY` (in a cloud session: the environment's settings, as an environment variable; picked up by new sessions) |
| Generator | `tools/gen.py` | `tools/gen_gemini.py` |
| Screen 1024×1536 | `--size 1024x1536` | `--aspect 2:3 --image-size 2K` |
| Asset 816×816 | `--size 816x816` | `--aspect 1:1 --image-size 1K` |
| Sheet 1536×816 / scene 1536×640 | `--size 1536x816` / `1536x640` | `--aspect 16:9` / `--aspect 21:9`, `--image-size 1K` |
| Transparent background | `--background transparent` | not supported: ask for a flat key colour in the prompt, then `tools/chroma_key.py` before `harden_alpha.py` (see "Gemini" in the reference) |
| Model | `gpt-image-2.5-sunburst` | `gemini-3-pro-image-preview` for screens and anchors; a Flash image model for cheap assets if the user prefers (check with `gen_gemini.py --list-models`) |

Everything else (the brief, prompts in files, budget caps, the log, anchors, reviews,
building and verifying) is the same. Quote costs from the provider's own table.

## Ground rules

- **Leave the project untouched.** Everything you create lives under the `design/` folder
  (see "Folder layout"). Never edit, move or delete existing project files, never add
  dependencies, never commit, never change git config or project settings, and never write
  outside `design/` without the user's explicit permission for that specific step. That way
  the user can try the method risk-free: if it is not for them, they delete `design/` and
  nothing else has changed.
- **Talk to the user at the decision points only**: key, plan, references, each round's
  budget, each review, which image is authoritative. Between those, work without asking.
  When you ask, ask everything you need for that step in one message.
- **Never print the API key**, never echo it, never put it in a command line that is shown,
  a log, a prompt file or a commit. Scripts read it from the environment or `design/.env`.
- **Ask for budget approval before every round**, with the number of images and the
  expected cost (see "Costs" below). Enforce the approved amount as a hard cap in the
  generator script. If a redo would exceed it, stop and ask.
- **Every prompt lives in a file** (the brief, the preamble, each screen or asset prompt).
  Never type a prompt only into a command. The files are the record and the reuse.
- **Log every request**: output file, step, size, background, references, prompt length,
  wall time, the returned `usage` and the computed cost, one JSON line per request. Also log
  the start and end time of each step to a timeline file. You will report these numbers.
- **Keep every image, including rejected ones** (rename a rejected first try to
  `*-v1-rejected.png` before redoing it). Never overwrite silently.
- **Show the user images, not descriptions of images.** Give the file paths, and if the
  environment can display images or publish a page, show them side by side.

## Folder layout

Create this under the project root (adjust the name if `design/` is taken). The folder is
self-contained: deleting it undoes everything this workflow did.

```
design/
  .env                  OPENAI_API_KEY=... (the user's key; never printed, never committed)
  .gitignore            one line, `.env` (the project's own .gitignore stays untouched)
  PLAN.md               product plan (existing one linked, or the one you draft)
  refs/                 the user's reference screenshots + NOTES.md (their notes, verbatim)
  DESIGN-BRIEF.md       the brief
  PROMPTS.md            preamble(s) + one fenced block per screen, per round
  prompts/              generated per-request prompt files (preamble + block), for the log
  round1/               first-round screens, REVIEW.md (your critique), USER-REVIEW.md (verbatim)
  anchors/              style anchors (crops, character sheet, hero, logo, scene)
  anchors/clean/        hardened versions
  assets/               one asset per image (icons, mascot poses)
  assets/clean/         hardened versions; ICONS.png contact sheet
  round2/               remaining screens, light and dark, REVIEW.md
  final/                the authoritative image per screen (copies), AUTHORITATIVE.md
  tools/                gen.py or gen_gemini.py, chroma_key.py (Gemini), harden_alpha.py,
                        contact_sheet.py, crop.py, flatten.py
  log.jsonl             one line per billed request
  timeline.txt          step start/end timestamps
  COSTS.md              per-request and per-step table, written at the end
```

## Step 1: the API key

Check whether an OpenAI key is available without printing it, for example:

```bash
test -n "$OPENAI_API_KEY" && echo "key in environment" || echo "no key in environment"
grep -q '^OPENAI_API_KEY=.\+' design/.env 2>/dev/null && echo "key present" || echo "no key"
git check-ignore -q design/.env && echo "design/.env is ignored" || echo "design/.env is NOT ignored"
```

The key lives in `design/.env`, inside the design folder, so the project's own files are not
touched. **Before** the key goes in, create `design/.gitignore` containing `.env` and check
with the command above that git ignores `design/.env` (outside a git repo, skip that check).
Then ask the user to create `design/.env` with a line `OPENAI_API_KEY=...` themselves. Do not
ask them to paste the key into the chat. If the project already keeps secrets in its own
file and the user would rather use that, ask before reading from it, and never edit it or its
`.gitignore` without their permission. Then make one cheap call to confirm access (for example list models
with curl, printing only the HTTP status). If it fails, show the user the error message
from the response body (never the key) and let them sort out access on the OpenAI side.

**With Gemini**, the key is `GEMINI_API_KEY`. In a cloud session the user adds it in the
environment's settings (the cloud environment menu in the session's title bar, then Edit) as
an environment variable; only sessions started after that see it. Locally it can go in
`design/.env` as above. Check access with `python3 design/tools/gen_gemini.py --list-models`,
which prints the image models the key can use and never the key; pick the model from that
list and correct the price table in the script if the current prices differ.

## Step 2: the project plan

The brief is derived from the project, and that is what makes this method work. Look for
an existing plan, spec, README, data model or screen list. You need:

- purpose and users (who, how often, how long a session is);
- the features;
- **the screens, and the data each screen shows**;
- a sketch of the data model, so the content in the images is realistic.

If this exists, summarise it in `design/PLAN.md` with links and confirm the screen list with
the user in one message. If it does not, draft a one-page plan with that structure from what
you know of the project and ask the user to correct it. Do not go on until the screen list
is agreed.

## Step 3: references and notes

Ask the user for **two to four reference screenshots** (any apps or sites) and, for each
image, **one or a few specific things they like or dislike about it, not about the app as
a whole**. Explain why: the model copies whatever it is shown, so you need to know exactly
which element to take from each image and to tell the model to ignore the rest. Give them
this example, from the Sprouty notes:

> I point out just one or a few things I like. So don't look at the app as a whole, look at
> what I refer to specifically as something I like.
>
> App 1: I like the coloured cards (Weekly distance, Pace, Shoes, Goals, Streak, Next run).
> Those give the app a little life, instead of all being a single color. I like the overall
> fairly simple layout.
>
> App 2: I like the icons at the top of the first screen (Camping, Paddling, Campfire,
> Routes). My thought here is that we make the app in a sort of retro pixel design language,
> like pixel art for a computer game. [...] I think there's a little too much going on with
> regards to overall layout.
>
> App 3: I like that there's some images, for example above "Slow breathing" there's an
> image. [...] I also like the fairly calm green screen on the right, suitable as reference
> for our "today" watering screen, but I think we should add a little pixel art, maybe we
> could even have a little animated pixel guy that is cheering you on.

Good notes name an element, say why, and say where it belongs in our product. Save the
images in `design/refs/` and the notes verbatim in `design/refs/NOTES.md`. Then **look at
every image yourself** and find each element the notes point at. If a note is ambiguous
(which icons? which screen?), ask once.

## Step 4: the brief and the prompts

Write `design/DESIGN-BRIEF.md` from the template in the reference section below. The
essentials:

- The product in one paragraph, from the plan.
- The feel, quoting the user's own words.
- A table of references: file, **exactly what to take**, what explicitly not to take, and
  the user's words.
- The visual system: where the distinctive style applies and where the UI stays plain (in
  Sprouty, pixel art is only for icons, the mascot and small illustrations; cards, buttons
  and text are clean and modern), type, colours as hex values, shape, spacing, the mascot or
  signature element described precisely, light and dark, navigation.
- **Per screen, an exact numbered element list with realistic content**: one fixed date,
  named example records from the data model, real button labels, real counts. The content
  must be consistent across screens (the same plants due on Home, Today and Schedule).
- A "not wanted" list, always including **"do not add chrome that is not listed"** (no extra
  headers, banners, badges, search bars, avatars, notification bells or dots, promo cards,
  extra tabs).

Then write `design/PROMPTS.md`: one **shared preamble** (product, output format, what each
attached reference is for, visual system, mode line, rules) and one fenced block per screen
that lists the elements top to bottom. Each request sends preamble + one block. Dark mode is
a replacement of the preamble's `MODE:` line (and of any light colours hard-coded in the
screen block, see pitfalls). Show the user the brief's reference table and the screen list
in a short message; they do not need to read the prompts.

## Step 5: first round (two or three key screens)

Pick the two or three screens that carry the most design decisions (usually the home
screen, the signature or focus screen, and one text-heavy screen). Ask for approval:
"Round 1: 3 screens at 1024×1536 with the 3 references attached, about $0.08–0.09 each,
about $0.25 in total, cap $0.35 (one spare). About 35 s, run in parallel. OK?"

Generate them in parallel with the generator script, all references attached in the order
the preamble describes. Then write `round1/REVIEW.md`: a cost/time table and **your own
critique against the brief**, screen by screen: which listed elements are present, what is
missing or wrong, what was added that was not listed, where each reference's element shows
up, and cross-screen problems (the mascot drawn differently on each screen, faces on things
that should not have them). Present the images plus a short version of the critique, and
ask the user for their review in their own words.

Save their review verbatim in `round1/USER-REVIEW.md` and **turn it into a numbered list of
decisions** (in Sprouty: "no faces on plant pots, only on the mascot"; "pixel logo with the
mascot at the top of Home"; "remove the icon row from Home"; "pixel-art icons in the bottom
nav"; "plant detail hero is a large mascot"; "the windowsill scene gets taller, two pots,
the mascot watering one"; "one consistent icon per plant across all screens"). Confirm the
list with the user in one message only if something in their review was unclear.

## Step 6: anchors

Anchors are the images that define the style, attached as the **first references on every
later request**. Without them the mascot and the illustration style drift from image to
image; with them the model is strongly consistent. Build them from what the user approved:

1. **Crop** approved elements from the round-1 screens with `tools/crop.py` (the mascot as
   drawn on each screen, a scene the user liked).
2. **Generate** from the crops, on a transparent background:
   - a **character sheet**: the mascot in all its states in one row, same size, no labels
     (Sprouty: idle, holding a can, watering, happy, sleepy; 1536×816);
   - a **hero** version of the mascot, large (816×816);
   - the **logo** (816×816), for example the mascot plus a wordmark, spelled out letter by
     letter in the prompt;
   - the **signature scene** or hero illustration (Sprouty: the windowsill, 1536×640).
3. Look at each result against the decisions. Redo what fails (in Sprouty the first hero
   lost its arms and legs; the redo prompt said it MUST have them and attached the sheet).

Ask for budget first: "Anchors: 4 images, $0.03–0.06 each, about $0.25, cap $0.35."

## Step 7: assets, cleanup and the contact sheet

Generate **one asset per image** on a transparent background, 816×816: each icon, each
plant or item illustration, any extra mascot pose. Attach the character sheet and the
approved round-1 screen that shows the style, and use **one prompt template for the whole
set** (same style sentence, same "readable at 28 px", same palette), so the set is
consistent. Expect about $0.07 each with two references.

Then, locally and unbilled:

1. Run `tools/harden_alpha.py` over all transparent anchors and assets into `clean/`
   folders: alpha is thresholded to fully opaque or fully transparent, fully transparent
   pixels get their colour zeroed, the image is trimmed to its content. This removes the
   soft halo the model leaves around sprites.
2. Run `tools/contact_sheet.py` on the cleaned files. It draws every asset on the light
   surface colour and again on the dark one, scaled with nearest-neighbour, with its name.
   Look at the dark half closely: any glow, fringe or grey box means the cleanup failed or
   the asset needs a redo. Also compare pixel scale and outline weight across icons.
3. **Flatten before reusing.** A transparent PNG must never be attached as a reference as
   is: the model sees the hidden colours and soft edges and learns the glow. Attach the
   contact sheet (it is flattened onto colour) or a `tools/flatten.py` copy. Tell the model
   in the prompt that the names under the icons are file names and must not be rendered.

Show the user the contact sheet and the anchors. This is a good moment for a quick yes/no,
not a full review.

## Step 8: remaining screens and dark variants

Write a round-2 preamble: the attached images are now **the app's own art, to be reused
exactly** (image 1 the character sheet with each pose named, image 2 the scene, image 3 the
icon sheet with each icon's name and meaning, image 4 the previous version of this screen
if one exists: keep its layout and change only what the screen block says). Put each
decision from the user's review into the preamble or the relevant screen block, in plain
imperative words ("Plant pots NEVER have faces, eyes or mouths, anywhere on the screen").

Generate the remaining light screens, then regenerate the round-1 screens the decisions
changed, then the dark variants with the light version of the same screen attached as the
last reference. Ask for budget first: "N screens, about $0.07–0.09 each with 3–4 references,
about $X, cap $Y." Critique every result against the brief and the decisions in
`round2/REVIEW.md`, redo what misses a decision, list what remains soft, and present the set
to the user for a final review.

## Step 9: choose the authoritative images

Ask the user: **"Which image is authoritative for each screen?"** Offer your suggestion as a
table (screen, light file, dark file, known deviations to ignore, such as an unlisted
chevron or placeholder text). Copy the chosen files into `design/final/` and record the
table and the user's answers in `final/AUTHORITATIVE.md`. Where two images disagree, the
authoritative one wins; where an image disagrees with the brief on content (copy, data), the
brief wins, because generated text is placeholder.

## Step 10: build the UI from the images

The images are the spec. Build the screens in the project's real stack. This is the point
where the project itself changes, so ask the user for an explicit go-ahead first, and propose
working on a new git branch or in a folder they name, so their existing code stays as it was
until they decide to keep the result.

- Measure layout from the images as ratios, not absolute pixels: the 1024 px image width is
  the device width (about 2.5–2.8 image pixels per dp/pt on a 360–412 wide phone). Take colours from the brief's
  hex values, not from sampling the image.
- Use the cleaned assets directly: **one asset file per icon or sprite**, the same file on
  every screen that shows it. Never re-draw an icon in code or crop a second copy from a
  screen image. Scale pixel art with nearest-neighbour filtering and integer factors.
- Real copy comes from the plan or the product owner, not from the text in the images.
- Build light and dark from the same tokens.

Then **verify against the images**: take screenshots of the build (screenshot tests at a
fixed viewport, a headless browser, or a real device) and compare each one side by side
with its authoritative image. List differences, fix them, repeat. Show the user the
side-by-side pairs at the end.

## Step 11 (optional): in-page review

If the result is a set of rendered pages the user will keep refining, offer the in-page
review tool from the `review-tool` skill: the user selects text on the real page and leaves
an instruction, and a later session carries the notes out. Installing it adds code to the
project, so only with the user's explicit go-ahead.

---

# Reference

## API facts

- Endpoint: `POST https://api.openai.com/v1/images/edits`, multipart form. Reference images
  go in repeated `image[]` fields, in the order the prompt describes them.
- Model `gpt-image-2.5-sunburst`. Parameters used: `quality=high`, `output_format=png`,
  `n=1`, `background=transparent` for assets or `opaque` for screens, `size=WxH`.
- **Sizes must be multiples of 16**, and the minimum is about 816×816 in total pixel count
  (wide sizes such as 1536×640 and 1536×816 work). Screens: **1024×1536** portrait. Single
  assets: 816×816. Sheets and scenes: 1536×816, 1536×640.
- The response has `data[0].b64_json` (the PNG) and a `usage` object: `input_tokens_details`
  with `text_tokens` and `image_tokens`, and `output_tokens`. **Compute cost from usage**;
  at the list prices used in the example, text input $5/M, image input $8/M, image output
  $30/M tokens. Check the current prices once at the start.
- Each request takes **30–40 s** and returns synchronously; there is no batch queue to wait
  on. **Requests can run in parallel**: a round of eight screens takes about as long as one.
- Every request is billed, including one whose prompt was silently cut short.

## Costs to quote when asking for budget

| Request | Typical cost |
|---|---|
| Screen 1024×1536, one reference (or none) | about $0.055 |
| Screen 1024×1536, three or four references | $0.08–0.09 |
| Screen 1024×1536 with three anchor references (sheet, scene, icon sheet) | $0.07–0.075 |
| Asset 816×816 transparent, two to three references | $0.05–0.07 |
| Wide sheet or scene (1536×816, 1536×640), two to three references | $0.03–0.04 |
| First round of three screens | about $0.25 |
| Whole Sprouty design, 28 images incl. 3 redos | $2.01 |

Budget one spare request per round for a redo.

## Gemini: API facts and costs

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`,
  JSON body, key in the `x-goog-api-key` header. The prompt is the first part, then each
  reference as an `inline_data` part (`mime_type`, base64 `data`), in the order the prompt
  describes them.
- `generationConfig`: `responseModalities: ["IMAGE"]`, `imageConfig.aspectRatio` (`1:1`,
  `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`) and `imageConfig.imageSize`
  (`1K`, `2K`, `4K`, capital K). Sizes are chosen by ratio, not pixels.
- The image comes back as `candidates[0].content.parts[].inlineData` (base64, with its
  `mimeType`); `usageMetadata` has `promptTokenCount`, `candidatesTokenCount` and the split
  by modality. The image output is billed as tokens: about 1120 for 1K/2K, 2000 for 4K.
- **No transparent background.** See `chroma_key.py` below.
- Reference limits (Gemini 3 Pro Image): up to 6 object images, 5 character images, 3 style
  images, 14 in total. Attach fewer and sharper rather than more.
- Every image carries an invisible SynthID watermark; it does not affect the design use.
- Requests are synchronous and can run in parallel, as with OpenAI.

| Request (Gemini) | Typical cost |
|---|---|
| Screen 2:3 at 2K, Gemini 3 Pro Image, with references | about $0.14 |
| Asset or sheet at 1K, Gemini 3 Pro Image | about $0.14 |
| Asset at 1K, a Flash image model | about $0.04–0.07 |
| First round of three screens (3 Pro) | about $0.42 |
| A whole design of about 28 images (3 Pro screens, Flash assets) | about $2.5–3.5 |

These are list prices in October 2026; check them on the first run (the `PRICE` table in
`gen_gemini.py`). The script reserves $0.25 per in-flight request against the cap, so a
round of three needs a cap of at least $0.75 to run all three in parallel.

## Request pattern: curl

```bash
set -a; . design/.env; set +a     # loads OPENAI_API_KEY without printing it
curl -s https://api.openai.com/v1/images/edits \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  --form-string model=gpt-image-2.5-sunburst \
  --form-string "prompt=$(cat design/prompts/r1-01-home.txt)" \
  --form-string size=1024x1536 \
  --form-string quality=high \
  --form-string output_format=png \
  --form-string n=1 \
  --form-string background=opaque \
  -F "image[]=@design/refs/ref-1.png" \
  -F "image[]=@design/refs/ref-2.png" \
  -F "image[]=@design/refs/ref-3.png" \
  > out.json
```

Use **`--form-string` for every text field** and `-F` only for the files. With `-F`, curl
interprets `@`, `<` and `;type=`-style suffixes inside the value, so a prompt containing a
semicolon can be cut off silently, and the truncated request is still billed.

## The generator script: `design/tools/gen.py`

One request per invocation, logged, with a budget cap that holds when several run in
parallel. Run several at once with `&` and `wait`.

Script: [`tools/gen.py`](tools/gen.py). Copy it into `design/tools/gen.py` on first use, do not retype it.

Build each prompt file from `PROMPTS.md` (preamble + the screen's fenced block, with the
`MODE:` line swapped for dark) with a few lines of Python, and write it to `design/prompts/`
before the request, so the exact text sent is on disk. Log each step's start and end:

```bash
echo "round1 $(date -u +%FT%TZ)" >> design/timeline.txt
```

Run requests in parallel, for example:

```bash
for s in 01-home 02-today 03-plant-detail; do
  python3 design/tools/gen.py --step round1 --cap 0.35 --out design/round1/$s-light.png \
    --prompt design/prompts/r1-$s-light.txt --ref design/refs/ref-1.png \
    --ref design/refs/ref-2.png --ref design/refs/ref-3.png &
done; wait
```

## The Gemini generator: `design/tools/gen_gemini.py`

Script: [`tools/gen_gemini.py`](tools/gen_gemini.py). Same log, cap and rules as `gen.py`;
the key is read from `GEMINI_API_KEY` and sent on curl's stdin; the request body is a JSON
file, so the prompt cannot be truncated the way curl `-F` truncates it.

```bash
python3 design/tools/gen_gemini.py --list-models
for s in 01-home 02-today 03-plant-detail; do
  python3 design/tools/gen_gemini.py --step round1 --cap 0.80 --out design/round1/$s-light.png \
    --prompt design/prompts/r1-$s-light.txt --aspect 2:3 --image-size 2K \
    --ref design/refs/ref-1.png --ref design/refs/ref-2.png --ref design/refs/ref-3.png &
done; wait
```

## `design/tools/chroma_key.py` (Gemini)

Script: [`tools/chroma_key.py`](tools/chroma_key.py). Gemini cannot draw transparency, so
every asset and anchor that should be transparent is drawn on **one flat key colour that
appears nowhere in the art**: magenta `#FF00FF` by default (use another if the palette has
pink or purple, never green or blue if the product uses them). The script flood-fills the
key colour from the border, so a key-coloured area inside the sprite survives, and removes
the key-tinted fringe on the outline. Then run `harden_alpha.py` and the contact sheet as
usual.

```bash
uv run --with pillow python3 design/tools/chroma_key.py design/assets/*.png --out design/assets/keyed
uv run --with pillow python3 design/tools/harden_alpha.py design/assets/keyed/*.png --out design/assets/clean
```

## `design/tools/harden_alpha.py`

Script: [`tools/harden_alpha.py`](tools/harden_alpha.py). Copy it into `design/tools/harden_alpha.py` on first use, do not retype it.

The 128 threshold suits pixel art. For smooth illustrations, a hard threshold gives jagged
edges; there, keep the alpha but still zero the colour of fully transparent pixels and
check the contact sheet.

## `design/tools/contact_sheet.py`

Script: [`tools/contact_sheet.py`](tools/contact_sheet.py). Copy it into `design/tools/contact_sheet.py` on first use, do not retype it.

Example: `uv run --with pillow python3 design/tools/contact_sheet.py design/assets/ICONS.png
5 200 design/assets/clean/*.png`.

## `design/tools/crop.py` and `design/tools/flatten.py`

Script: [`tools/crop.py`](tools/crop.py). Copy it into `design/tools/crop.py` on first use, do not retype it.

Script: [`tools/flatten.py`](tools/flatten.py). Copy it into `design/tools/flatten.py` on first use, do not retype it.

To find crop coordinates, open the screen image (you can read images) and estimate the box,
crop, look at the crop, adjust.

## Brief template (`DESIGN-BRIEF.md`)

```markdown
# <Product>: design brief

## What the product is
<One paragraph from the plan: what it does, for whom, how a session goes.>

## Feel
<Three or four adjectives and one sentence each; quote the user's own words from NOTES.md.>

## References: take exactly this, nothing else
| Ref | File | Take | Do not take | User's words |
|---|---|---|---|---|
| 1 | refs/ref-1.png | <the one element, precisely> | <its theme, content, icons...> | "<quote>" |

## Visual system
- Signature style and where it applies (and where the UI stays plain).
- Type: family in spirit, case, weights, sizes.
- Colour: surface light/dark, ink, secondary text, one accent, one secondary, card colours
  (hex for all).
- Shape and spacing: corner radius, borders/shadows, gutter, gaps.
- Mascot or signature element: exact description, and its states.
- Light and dark: what changes.
- Navigation: tabs, labels, where settings live.

## Screens: exact element list and content
Fixed date: <date>. Example records: <names from the data model, used on every screen>.
### 1. <Screen>
1. <element, with its exact content>
2. ...
<"No bottom navigation" etc. where relevant.>

## Not wanted
- <style exclusions: gradients, stock component-library look, emoji, photos...>
- No lorem ipsum; use the content above.
- **Do not add chrome that is not listed**: no extra headers, banners, badges, search bars,
  avatars, notification bells or dots, ads, promo cards or extra tabs.
```

## Preamble template (first round)

```
Design one mobile app screen for "<Product>", <one-line description from the plan>. Output a single flat, straight-on phone UI screenshot, full-bleed, 1024x1536 portrait, no device frame, no hands, no background outside the screen.

The <N> attached images are REFERENCES FOR SPECIFIC ELEMENTS ONLY; do not copy their apps, brands, copy, colours or layouts. Image 1: take only <element>. Image 2: take only <element>, but <how to transform it>. Image 3: take only <element>.

VISUAL SYSTEM: <signature style> is an ACCENT only: <where it applies>. Everything else is clean modern UI: <radius, flat colours, no heavy shadows, type, spacing, margins>. Colours: <surface hex, ink hex, secondary text hex, accent hex and its use, secondary hex and its use, card colours hex>.
MODE: light mode.
MASCOT "<Name>": <precise description>. <What it must never look like.>

RULES: render all text exactly as given, legible and correctly spelled. Include only the elements listed for this screen, in the order given. Do not add any chrome that is not listed: no extra headers, banners, badges, search bars, avatars, notification bells or dots, ads, promo cards or extra tabs. <Style exclusions.> <Only the mascot has a face; other objects never have faces.> Status bar at top shows 9:41 with signal, wifi and battery.

SCREEN:
```

For later rounds, replace the reference paragraph with "ATTACHED IMAGES ARE THE APP'S OWN
ART; reuse them exactly, same design, palette and pixel style", followed by one line per
attached image naming what it is and how to use it, and add the user's decisions as rules.

## Screen prompt template

```
<SCREEN NAME> screen, top to bottom:
1. <Element>: <exact content, position, colour role>.
2. <Element>: "<exact text>" (large bold) and under it "<exact text>" (secondary text).
3. <List or grid>: <how many>, each with <parts>:
   - <colour>: <icon name from the sheet>, "<name>", "<detail>", "<status>"
   - ...
4. Bottom navigation with <icons>, "<Tab>" selected.
<Explicit exclusions for this screen: "No bottom navigation bar, no other elements.">
```

The Sprouty Today screen, as sent in round 2:

```
TODAY focus screen, same layout as image 4. The whole screen is one flat calm sage green #7FA283, off-white text. Top to bottom:
1. Status bar in light text.
2. Small letter-spaced caps "TODAY · SUN 28 SEP" centred, a thin X close icon at top right.
3. Title "Watering time" large bold off-white, centred.
4. Centre of the screen: Sprouty in the happy pose (pose 4 of image 1), large (about 240px tall), tiny sparkle pixels, standing on a small pixel patch of grass. The focal point.
5. Under it "1 of 3 done" and a row of three pixel-art water-drop pips, the first filled, the other two outlined.
6. A list of three rounded off-white rows, each with the plant icon from image 3 (no faces), name bold, spot in secondary text, and a round tick at right:
   - plant-monty, "Monty", "Living room", tick filled sage with a white check
   - plant-goldie, "Goldie", "Bedroom shelf", empty tick circle
   - plant-basil, "Basil", "Kitchen window", empty tick circle
7. At the bottom, small off-white text: "Sprout says: you're doing great!"
No bottom navigation bar, no other elements.
```

## Asset prompt template

```
A single small <kind> icon for <product>: <subject, described concretely>. Crisp retro 16-bit game sprite pixel art: visible square pixels, limited palette, a 1px dark outline, flat colours, no anti-aliasing, no gradients, no soft glow, no drop shadow, no text. Simple, readable at 28px, same palette and outline weight as the attached character sheet (image 1) and the icons on the attached screen (image 2). Centred, front view, fills most of the canvas. No face on it. Do not draw the mascot. Transparent background: only the subject, nothing behind it, no ground patch, no frame.
```

Swap the style sentence for the project's style if it is not pixel art; keep everything else.

With Gemini, replace the last sentence with: "Background: one flat solid magenta #FF00FF
filling the whole canvas, edge to edge, no gradient, no shadow, no ground patch, no frame;
magenta appears nowhere in the subject itself." Then key it out with `chroma_key.py`.

## Pitfalls

- **Unrequested chrome.** The model adds headers, search bars, notification bells, badges,
  extra tabs, chevrons, small icons. Forbid it in the preamble, list exclusions per screen
  ("No bottom navigation bar, no other elements"), and still check every image for it.
- **Mascot drift.** Without an anchor the mascot has a different body, legs and proportions
  on every screen. Anchor it with a character sheet attached first on every request, and
  name the pose to copy ("pose 4 of image 1").
- **Faces on everything.** Ask for a cute mascot and plain objects grow faces too (every
  plant pot in Sprouty's round 1 smiled). State "only the mascot has a face; X never have
  faces, eyes or mouths" in the preamble and in each asset prompt.
- **Soft alpha halos.** Transparent output has semi-transparent edges and hidden colour in
  transparent pixels; it glows on dark backgrounds. Harden, then check the dark half of the
  contact sheet.
- **Transparent references teach the glow.** Flatten transparent images onto a colour
  before attaching them as references.
- **Pixel scale varies between icons.** Icons generated separately differ in pixel size and
  outline weight. Use one prompt template and the same references for the whole set, check
  them together on the contact sheet, and in the build scale with nearest-neighbour.
- **On-screen text is placeholder.** It is usually spelled right, but it is not copy. Real
  text comes from the brief and the product, never from reading the image.
- **Counts drift.** "A windowsill with pots" came back with three pots after the user asked
  for two. Write exact counts in capitals ("EXACTLY TWO plant pots, no more") and name each.
- **Dark variants copying light.** If a screen block hard-codes light colours ("off-white
  rows", "#7FA283"), the dark request is contradictory and returns a near-copy of the light
  screen. Swap those colours in the block, not only the `MODE:` line, and say "image 4 is
  the LIGHT version; keep layout, art and text, recolour everything for dark mode".
- **Names on the icon sheet get rendered.** Say that the names under the icons are file
  names and must never appear.
- **Prompt truncation with curl `-F`.** Use `--form-string` for text fields. A truncated
  prompt is billed like any other request.
- **Sizes.** Multiples of 16, and no smaller than about 816×816 in pixel count; the
  generator script checks the first.
- **No batch waiting, but no refunds.** Requests are synchronous and parallel, which makes
  it tempting to fire many; the cap in `gen.py` is what keeps the round within the approved
  budget.
- **Gemini: the key colour leaks into the art.** If the prompt does not forbid it, the model
  tints outlines or highlights with the background colour and they are keyed out as holes.
  Say that the key colour appears nowhere in the subject, and check the dark half of the
  contact sheet for holes as well as halos.
- **Gemini: ratios, not pixels.** Ask for `2:3` and `2K` for screens; when measuring layout
  in step 10, use the returned image's real width as the device width.

## At the end

Write `design/COSTS.md` from `log.jsonl` (per request: step, file, size, background, wall,
cost, note; per step: requests, summed wall, cost; grand total; redos and why), and report
to the user: total time from notes to final design (from `timeline.txt`, and how much of it
was their reviews), images and cost, the redos, the authoritative image table, and what the
build still deviates on.

## This file as a skill

This file is the `design-workflow` skill, at `.claude/skills/design-workflow/` in this
repository: Claude Code loads it when the user asks to design screens, or with
`/design-workflow`. The scripts in `tools/` next to it are the ones the steps above copy into
`design/tools/`. The original document is `docs/claude-design-workflow.md`.
