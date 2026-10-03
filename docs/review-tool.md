# In-page review tool

An optional companion to the design workflow. Once the designs exist as rendered pages,
the owner wants to say "make this shorter" or "this label is wrong" right where they see
it, and have Claude do it later. The loop: the owner opens a secret review link and leaves
notes on the text; a Claude Code session carries them out and marks them done; the owner
reloads and reviews again. This describes the tool from the user's side, stack-agnostic, so
a Claude Code session can build its own version for any project.

## Review mode, and everyone else

Opening a page with a secret review token in the URL (for example `?review=<token>`) turns
on review mode. Without the token, or with a wrong one, the page is **byte-identical** to
the normal page: no extra markup, classes, scripts or styles, nothing that hints the feature
exists. The server checks the token (constant-time comparison) and only then adds the review
client; the storage endpoint answers anything without a valid token with a plain "not
found". Regenerating the token kills every old review link.

## Leaving a note

- **Select text** on the page. A small **"+ Note"** button appears next to the selection.
- Click it: a popup shows the quoted text and a text box ("Instruction for Claude…").
- Write the instruction and **Save**. Escape or Cancel closes it without saving.
- The first time, the page asks for the **author name** ("Your name, shown on your notes").
  It is remembered in that browser and shown in the panel, where it can be changed. There
  are no accounts; the review link is the access.

## How notes stay attached

A note is anchored to **the quoted text itself**, not to a position in the page structure:
it stores the selected text (whitespace-normalised) plus about 50 characters of context on
each side, and is re-matched against the rendered text on **every load**, so it survives
edits elsewhere and content that changes between loads.

When a quote can no longer be found (because the text was rewritten), the note is **never
dropped**. It is listed in the panel under **"Orphaned (anchor no longer matches)"**, where
it can still be opened, edited or deleted.

## Highlights, editing, deleting

Every anchored open note is shown as a **highlight** on its text (yellow). **Clicking a
highlight** opens the note (author, date, number, quote, editable instruction) with
**Save**, **Delete** (confirmed first) and **Close**. So the owner can also share the link
with a trusted friend and moderate the friend's notes before handing them to Claude.

## "Ready for Claude"

Each note has a checkbox, **"Confirm: ready for Claude"**, checked by default. Unchecking it
keeps the note as a draft: it stays on the page, is marked "unconfirmed", and Claude will
not act on it. The owner checks it when they have made up their mind.

## The private response

The edit popup has a second text box, **"your response (private, never read by Claude)"**,
for answering a friend's note or a reminder to oneself; such notes highlight orange instead
of yellow. The command-line tool leaves this field out and the process below forbids
reading it any other way. It is for people only.

## The panel

A fixed, collapsible panel in a corner of the page shows:

- **"Review mode · N open"** as its title; click to collapse or expand.
- The author name (click to change).
- **Prev / Next** through the highlights in page order (opening collapsed sections on the
  way), a **"Go to #"** box, and a **Details** list of all open notes, click to jump.
- A count line: how many notes are highlighted, how many are unconfirmed.
- The orphaned list, if any.
- A collapsed **"Done notes (N)"** archive: notes Claude has completed, newest first, still
  clickable, so the owner can see what was done and reopen one if needed.

## The Claude side: a small command-line tool

Claude never works from the browser; it uses a CLI (or equivalent) on the same storage:

- **list**: the work queue: notes that are open **and** confirmed, per page, with number,
  author, quote, context and instruction. It prints only the **count** of unconfirmed notes.
- **show `<id>`**: one note in full (still without the private response).
- **done `<id>...`**: mark notes done.
- **reopen `<id>...`**: put a note back in the queue.
- Optionally **all**, listing every note including done ones.

## The process a Claude session follows

Write this down as a skill or process file in the project (for example a
`.claude/skills/reviewnotes/SKILL.md`), so the owner can just say "do my review notes":

1. **List** the open confirmed notes. Ignore unconfirmed ones; mention their count.
2. **Implement** each note. The quote tells you where; the instruction tells you what. If a
   note is ambiguous or conflicts with another, do the clear part and ask about the rest in
   the report instead of guessing. Keep the project's own rules (style, tests, build).
3. **Mark a note done only when its work is complete**, never in advance and never for a
   partial change. A note that could not be done stays open, with the reason in the report.
4. **Verify blind**: a fresh agent (or a clean pass) that has not seen the changes gets the
   list of notes and the rendered result, and checks note by note whether each instruction
   was carried out. Anything that fails is fixed, or reopened.
5. **Commit** per the project's rules and **report**: which notes were done, which were not
   and why, what needs a decision.

Never read or quote the private response field, in the CLI, in ad-hoc database queries or
in raw API output.

## What to verify when you build it

Tokenless and wrong-token pages are byte-identical; the endpoint without a token gives an
empty "not found"; add, edit, delete, done and reopen round-trip through browser and CLI;
a rewritten quote shows up as orphaned; the CLI never prints the response field.

## Deliberately left out

This description does not include **lock-and-share** (frozen read-only snapshots of a page
with its notes) or **point notes** (notes attached to a paragraph position instead of
selected text). Leave them out unless the owner asks for them.
