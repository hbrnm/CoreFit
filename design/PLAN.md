# CoreFit: planul pentru design

Rezumat din cod (`src/`), ca bază pentru brief. Sursele: `src/App.tsx` (taburi),
`src/features/*` (ecrane), `src/lib/db.ts` (datele), `README.md`.

## Ce e și pentru cine

PWA de fitness instalat pe telefon (iPhone, din Safari), în română. Un singur om își notează
antrenamentele de forță, mâncarea și sănătatea coloanei. Merge și fără internet; cu cont, se
sincronizează prin Supabase. Folosit zilnic: 1–2 minute dimineața (ce am azi, apă, greutate),
40–70 de minute în sală (seturi, pauze), câteva minute la mese.

## Funcții

- **Antrenament**: rutine și plan pe săptămână, antrenament activ (seturi, greutate,
  repetări, RIR/RPE, superset, cronometru de pauză), progresie automată, istoric, 1RM,
  oboseală pe grupe musculare, calculator de discuri, import din Hevy/Strong/FitNotes.
- **Nutriție**: jurnal pe mese, ținte de calorii și macronutrienți, apă, greutate, rețete,
  plan de mese, scanare de cod de bare, fază (menținere, slăbire, masă, fără zahăr).
- **Sănătate**: pauze de mișcare, programe ghidate (McGill Big 3) cu cronometru, jurnal de
  durere pe regiuni, ghid, prevenție pe termen lung.
- **Profil**: date personale, obiective, aspect (deschis, închis, automat), backup și import,
  cont.

## Navigare

Bară de jos cu 5 taburi: **Acasă, Antrenament, Nutriție, Sănătate, Profil**. Antet subțire
cu „CoreFit” și starea sincronizării. Fiecare tab are sub-secțiuni ca butoane segmentate:
- Antrenament: Start, Galerie, Istoric, Progres
- Nutriție: Jurnal, Plan, Rețete, Progres, Unelte
- Sănătate: Azi, Programe, Durere, Ghid, Prevenție

## Ecranele propuse pentru design

| # | Ecran | Ce arată |
|---|---|---|
| 1 | **Acasă** | salut, rutina de azi (sau următoarea), grupe încă obosite, calorii și apă azi, săptămâna (efort aerob, zile de forță), greutatea pe 30 de zile |
| 2 | **Antrenament activ** | numele rutinei, durata, exercițiile cu seturile lor (greutate × repetări, bifă), sugestia de progresie, superset, „Termină” |
| 3 | **Nutriție, Jurnal** | ziua, calorii și macro față de țintă, mesele (mic dejun, prânz, cină, gustări) cu alimentele, apa |
| 4 | Pauză între seturi | cronometru mare, ±15 s, „Sari peste”, următorul set |
| 5 | Antrenament, Start | rutina de azi, antrenament liber, planul săptămânii |
| 6 | Antrenament, Progres | grafic 1RM estimat, oboseala pe grupe (harta corpului), echilibru muscular |
| 7 | Sănătate, program ghidat | cronometrul-disc, exercițiul curent, pasul X din Y, oprire pentru durere |
| 8 | Profil | aspect, date personale, obiective, date și cont |
| 9 | Conectare | logo, „Conectare / Cont nou”, email, parolă |

**Runda 1** (cele care decid cel mai mult): 1 Acasă, 2 Antrenament activ, 3 Nutriție Jurnal.
Restul în runda 2, plus variantele întunecate.

## Date de exemplu (aceleași pe toate ecranele)

- Data: **sâmbătă, 3 octombrie 2026**; utilizator **Andrei**.
- Rutina de azi: **Upper A** (plan Upper / Lower), 4 exerciții:
  - Împins cu bara la piept (Bench Press): 3 × 6–8, 80 kg, sugestie „+2,5 kg data viitoare”
  - Ramat cu bara (Barbell Row): 3 × 8–10, 70 kg
  - Împins deasupra capului (Overhead Press): 3 × 6–8, 47,5 kg
  - Tracțiuni (Pull-up): 3 × max, greutatea corpului; superset cu Flotări la paralele
- Antrenament în desfășurare: 32 min, 7 din 12 seturi făcute.
- Grupe obosite: Piept, Triceps.
- Nutriție: 1 840 din 2 400 kcal; proteine 128 / 160 g, carbohidrați 190 / 260 g,
  grăsimi 62 / 75 g; apă 1 250 / 2 500 ml; greutate 82,4 kg (trend −0,6 kg în 30 de zile).
  - Mic dejun: Iaurt grecesc cu ovăz și afine, 420 kcal
  - Prânz: Piept de pui cu orez și salată, 680 kcal
  - Gustare: Măr și migdale, 240 kcal
  - Cină: nimic încă
- Săptămâna: 95 / 150 minute efort aerob, 2 / 3 zile de forță.

## Temă existentă

Tema actuală (PR #10, încă neîmbinat) are token-uri pentru modul deschis și cel închis,
albastru electric `#2563EB` ca brand și accente pe secțiuni: antrenament `#C2410C` / `#FB923C`,
sănătate `#0E7490` / `#22D3EE`, nutriție `#166534` / `#4ADE80`. Brief-ul o poate păstra
ca punct de plecare sau o poate schimba, după referințele tale.
