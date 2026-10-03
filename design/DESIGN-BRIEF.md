# CoreFit: design brief

## What the product is
CoreFit is a Romanian-language fitness PWA installed on an iPhone. One person logs strength
training, food and spine health; it works offline and syncs to an account. Daily use: a
1–2 minute morning check (what is on today, water, weight), 40–70 minutes in the gym logging
sets and resting between them, a few minutes at meals. See PLAN.md.

## Feel
- **Calm and precise**: a tool you trust mid-set, with sweaty hands, at a glance.
- **Clean, native iOS quality**: like Apple Fitness or Apple Health, not a game or a startup
  landing page.
- **Data first**: numbers big and legible, labels quiet.
(No user references or notes yet: round 1 is generated from this brief alone.)

## References
None in round 1.

## Visual system
- Style: clean modern iOS UI. Flat surfaces, no gradients, no glass, no neon glow.
- Type: SF Pro (iOS system font). Screen titles 28–34 pt bold; card titles 20 pt semibold;
  body 15–17 pt; numbers in tabular figures, big ones 34–48 pt bold.
- Colour (light mode, round 1):
  - page background #F2F4F7, cards #FFFFFF with a 1 px #E2E8F0 border and a very soft shadow
  - text #0F172A, secondary text #475569, tertiary #566479
  - brand blue #2563EB: primary buttons (white text), selected segment, selected tab, links
  - section accents, used only for small things (a 4 px left stripe on a card, an icon,
    a chart line, a small label): workouts orange #C2410C, nutrition green #166534,
    health teal #0E7490
  - success #15803D (done sets, ticks), warning #92400E (tired muscles), danger #B91C1C
- Shape: cards 16 px radius, buttons and inputs 12 px, 16 px page margins, 12 px gaps.
- Icons: thin line icons (Lucide / SF Symbols style), 1.75 px stroke, never filled emoji.
- Dark mode (round 2): page #0B1220, cards #151E2E, text #F1F5F9, secondary #B4C0D0, same
  brand blue, lighter accents (orange #FB923C, green #4ADE80, teal #22D3EE).
- Navigation: bottom tab bar, 5 tabs with icon and label: Acasă (house), Antrenament
  (dumbbell), Nutriție (apple), Sănătate (heartbeat line), Profil (person). Selected tab in
  brand blue, others grey. Top header: "CoreFit" bold at left, sync state at right.

## Screens: exact element list and content
Fixed date: Saturday 3 October 2026 ("Sâmbătă, 3 octombrie"). User: Andrei. Routine of the
day: Upper A. All text in Romanian, exactly as written in PROMPTS.md.
1. Acasă (home): greeting, today's routine card, nutrition today, this week, weight.
2. Antrenament activ (active workout): Upper A in progress, 32 min, 7 of 12 sets.
3. Nutriție, Jurnal: today's meals, calories and macros, water.

## Not wanted
- Gradients, glassmorphism, neon glow, drop shadows heavier than a hairline, 3D, emoji,
  stock photos, people, illustrations of athletes.
- No lorem ipsum, no English text on screen.
- **Do not add chrome that is not listed**: no extra headers, banners, badges, search bars,
  avatars, notification bells or dots, ads, promo cards or extra tabs.
