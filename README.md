# CoreFit

Aplicație completă de fitness și sănătate: **PWA Web** și **Aplicație Nativă Mobilă iOS/Android (`mobile/`)** cu integrare Apple Health/CoreMotion, baze de date offline-first (SQLite & IndexedDB), urmărire avansată a antrenamentelor (openGym), nutriție & rețete (OpenNutriTracker/NutriTrace), scanner cod de bare România și animații 3D anatomice fluide.

---

## 📱 Aplicația Nativă Mobilă (`mobile/`)

Aplicație React Native (Expo SDK 57) dezvoltată special pentru performanță nativă direct pe iPhone și Android:

- **Senzori Nativi & Apple Health**: Pedometru în timp real prin CoreMotion (`expo-sensors`), inele animate SVG pentru pași, hidratare și timpi de odihnă.
- **Bază de date Offline-First SQLite**: Salvare 100% locală și securizată prin `expo-sqlite` și `zustand` (jurnal antrenamente, PR-uri, hidratare, greutate corporală, alimente).
- **Antrenament Științific (openGym Parity)**: 4 rutine evidence-based (Hypertrophy 4-Day, PPL 3-Day, Full Body 3-Day, Mobility 2-Day), logger activ cu tipuri de serii (Normal, Warmup, Dropset, Failure), calcul automat 1RM (Epley), calculator de discuri olimpice, feedback haptic (`expo-haptics`) și antrenor vocal în română (`expo-speech`).
- **Animații 3D Anatomice Fluide**: 30+ exerciții ilustrate prin GIF-uri 3D cu evidențierea mușchilor țintă în roșu, ritm biomecanic calibrat și accelerare grafică hardware prin `expo-image`.
- **Nutriție & Scanner Cod de Bare România**: Jurnal de mese, rețete fitness cu adăugare instantanee dintr-un click, căutare în baza de date România (Open Food Facts Romania) și scanare ultrarapidă cu camera (`expo-camera`).
- **Securitate & Backup**: Blocare cu Face ID / Touch ID (`expo-local-authentication`), prevenire stingere ecran (`expo-keep-awake`) și export complet JSON.

### Pornire Aplicație Mobilă
```bash
cd mobile
npm install
npx expo start
```

---

## 🌐 Aplicația Web (PWA)

Stack: React 19, Vite, TypeScript, Tailwind 3, Dexie (IndexedDB), Supabase (cont și sincronizare), vite-plugin-pwa.

### Pornire rapidă Web

```bash
npm install
npm run dev
```

Fără configurare, aplicația rulează în **mod local**: fără cont, datele stau doar pe dispozitiv.

## Ce conține

**Antrenament**
- Antrenament gol sau din rutină, cu seriile precompletate din ultima sesiune, bifare pe serie, serii de încălzire, cronometru de pauză (-15, +15, sari), note.
- Rutine proprii (editor cu serii, repetări, pauză, reordonare) și șabloane: Full body, Upper/Lower, Push/Pull/Legs, acasă fără echipament.
- Bibliotecă de exerciții pe grupe musculare, cu exerciții proprii.
- Progresie automată, pe rutină: liniară (5x5 clasic), dublă (interval de repetări, apoi +greutate), Greyskull (ultima serie AMRAP, cu salt dublu sau reset la eșec) sau fără sugestie. Override pe exercițiu, rutini de deload care nu trag progresia în jos.
- Superseturi: legi două sau mai multe exerciții consecutive dintr-o rutină, ca să le faci pe rând, fără pauză între ele, cu o singură pauză după ultimul din grup, marcate vizual în antrenamentul activ.
- Istoric pe sesiuni, progres pe exercițiu (1RM estimat), recorduri detectate la finalul antrenamentului, serii pe grupă musculară.
- Cardio (durată și intensitate), calculator de discuri, progres săptămânal față de recomandarea OMS.

**Sănătate**
- 11 programe pe zone: lombar (mișcare de bază și Big 3 McGill), gât, umăr, șold, genunchi (durere femuro-patelară și artroză), tendonul lui Ahile, fascia plantară, pauză de mișcare.
- Fiecare program arată nivelul dovezii (ghid clinic, consens, studii, recomandare generală), ce spun sursele, ce nu e recomandat, semnele de alarmă și sursele cu link.
- Player ghidat (menținere cronometrată, repetări, pauze) cu durere înainte și după sesiune.
- Jurnal de durere pe zone, cu grafic, plus evaluarea rapidă a coloanei.

**Nutriție**
- Jurnal pe mese, navigare pe zile, "copiază mesele de ieri", apă.
- Ținte de calorii și macronutrienți (Mifflin-St Jeor, activitate, fază), sau țintă manuală.
- Căutare în lista locală, în Open Food Facts, după cod de bare (scanare cu camera unde browserul permite), alimente proprii.
- Rețete din ingrediente crude, cu valori pe porție și, dacă notezi greutatea gătită, la 100 g de preparat.
- Import de rețete dintr-un link (rețete cu date structurate schema.org/Recipe) sau din text lipit: interpretează cantități, unități (g, ml, linguri, cani, bucăți, căței, conservă cu grame între paranteze) și potrivește fiecare ingredient cu un aliment, cu o listă de verificare înainte de salvare.
- Trend al greutății și consum estimat din datele tale (calorii notate și mișcarea trendului).
- Provocarea fără zahăr și făină (seria de zile) și scanerul de etichete.

## Cont și sincronizare (Supabase)

1. Creează un proiect Supabase.
2. Rulează, în ordine, `supabase/migrations/20260920000001_create_fitness_schema.sql` și `supabase/migrations/20260921000001_modules_v2.sql` (SQL Editor sau `supabase db push`). Sunt idempotente.
3. Copiază `.env.example` în `.env.local` și completează `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`.
4. În Supabase, Authentication, Providers: activează Email.
5. `npm run dev`.

Sincronizarea: scrierile merg întâi în IndexedDB; se trimit la 1,5 s după o modificare, la revenirea online și la 2 minute; se aduc doar modificările mai noi (cursor pe `updated_at`); la conflict câștigă modificarea cu `client_updated_at` mai nou. Ștergerile sunt "soft", ca să ajungă pe toate dispozitivele. Toate tabelele folosesc aceeași logică (`src/lib/sync.ts`, lista `SPECS`).

## Build și instalare

```bash
npm run typecheck
npm run build
npm run preview
```

Publică `dist/` pe orice hosting static cu HTTPS. Pe telefon: "Adaugă pe ecranul principal". Camera pentru coduri de bare cere HTTPS.

## Structura

```
src/
  data/        exercises, routineTemplates, health (conținut cu surse), foods
  lib/         db (Dexie), sync, workoutOps, workoutStats, nutrition, nutritionOps, off, ingredients
  hooks/       useAuth, useSync, useLive, useCatalog, useToday, useNow
  components/  ui, charts, WeeklyGoals
  features/    auth, workouts, health, spine-health (McGill), nutrition, profile
supabase/migrations/   schema, RLS, triggere
```

## Ce trebuie să știi

- **Conținutul de sănătate** (`src/data/health.ts`) rezumă ghiduri și studii citite la construirea aplicației (NICE NG59, OARSI 2019, consensul femuro-patelar 2018, JOSPT 2017 și 2025, Silbernagel 2007, Rathleff 2015, OMS 2020). Dozele exacte de exerciții sunt tipice, nu cele din protocoale; regula durerii (până la 4 din 10, liniștită în 24 h) e o regulă practică adaptată din modelul studiat pentru tendinopatii. Nu e un înlocuitor pentru un medic sau kinetoterapeut. Recomand ca un specialist să-l revizuiască înainte de a-l da altora.
- **Lista locală de alimente** (`src/data/foods.ts`) are valori medii la 100 g, apropiate de USDA FoodData Central, verificate doar ca sumă energetică (4P+4C+9G). Nu are produse românești ambalate: pentru ele folosește Open Food Facts sau codul de bare. Produsele căutate online se salvează local ca să meargă și offline.
- **Open Food Facts** este o bază deschisă (ODbL) completată de utilizatori: verifică valorile cu eticheta. Cere internet.
- **Scanarea cu camera** folosește `BarcodeDetector`: merge în Chrome pe Android; pe iPhone (Safari) nu e activ implicit, deci acolo scrii codul manual.
- **Consumul estimat** are nevoie de cel puțin 10 zile cu mâncare notată și greutăți; dacă uiți mese, iese prea mic.
- Tipurile de set din versiunea inițială (power, miofibrilar, sarcoplasmatic) au fost înlocuite cu serii de lucru și de încălzire, ca în aplicațiile obișnuite de antrenament.
- **Progresia automată** (`lib/progression.ts`) e o funcție pură, ușor de testat, dar cu simplificări asumate: greutatea e presupusă uniformă pe toate seriile unui exercițiu (nu urmărește fiecare serie separat), iar "liniar" și "Greyskull" cad automat pe comportamentul "dublă" pentru exercițiile cu greutatea corpului sau cronometrate (nu există o greutate de crescut fiabil). Regula se aplică doar la pornirea unui antrenament din rutină; exercițiile adăugate liber în timpul unui antrenament repetă simplu ultima performanță, ca înainte.
- **Superseturile** se definesc doar în editorul de rutină (nu și ad-hoc, în timpul antrenamentului) și leagă un exercițiu de următorul din listă, nu de un exercițiu anume: mutarea unui rând cu săgețile sus/jos desface automat legăturile din jur, ca să nu apară perechi accidentale — re-leagă manual dacă mai ai nevoie după reordonare.
- Service worker-ul precache-uiește doar fișierele aplicației; răspunsurile Supabase și Open Food Facts nu sunt puse în cache.

## Valori ajustabile

| Ce | Unde | Valoare |
| --- | --- | --- |
| Pauza implicită între serii | `lib/workoutOps.ts`, `DEFAULT_REST_S` | 90 s |
| Ținte OMS afișate | `components/WeeklyGoals.tsx` | 150 min, 2 zile |
| Proteină | `lib/nutrition.ts`, `PROTEIN_G_PER_KG` | 1,8 g/kg |
| Grăsimi | `lib/nutrition.ts`, `FAT_KCAL_SHARE` | 25% din calorii |
| Ajustare pe fază | `lib/nutrition.ts`, `PHASE_ADJUSTMENT` | definire -20%, masă +10% |
| Ingrediente verificate pe etichetă | `lib/ingredients.ts`, `TOP_INGREDIENTS` | 5 |
| Durata promisiunii | `features/nutrition/ToolsPanel.tsx` | 66 zile |
| Piramida McGill | `features/spine-health/McGillBigThree.tsx` | 6-4-2, 10 s |
| Prag de încredere la potrivirea ingredientelor | `lib/foodMatch.ts`, `CONFIDENT` | 0,6 |
| Salt dublu la Greyskull | `lib/progression.ts`, `GREYSKULL_BIG_BEAT` | AMRAP cu 5+ peste țintă |
| Superseturi | `lib/workoutStats.ts`, `groupLinked` | grupare pe rutină, fără limită de exerciții |
