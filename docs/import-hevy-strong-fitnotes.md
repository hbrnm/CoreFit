# Import Hevy, Strong, FitNotes

Profil → Date → „Import din altă aplicație”. Se alege exportul CSV, se vede ce ar rezulta, apoi se confirmă.

## Cum funcționează

- Fișierul se citește pe dispozitiv (`src/lib/importCsv.ts`). Nu pleacă nicăieri și nu se apelează niciun API.
- Sursa se recunoaște după antet. Separatorul (virgulă, punct și virgulă, tab) se ghicește.
- Sesiunile și seriile primesc id-uri stabile (UUID derivat din sursă + cont + dată + nume + exercițiu + poziție, `stableId`). Un import repetat găsește aceleași id-uri și sare antrenamentele care există deja, inclusiv cele șterse sau modificate între timp. Nu e nevoie de o coloană nouă în Supabase.
- Numele exercițiilor se potrivesc cu catalogul (`src/lib/exerciseMatch.ts`): cuvintele se normalizează („Pull Up” = „Pull-up”, „Bench Press (Barbell)” = „Barbell Bench Press”), iar potrivirea trebuie să fie clară (scor peste prag și fără egalitate). „Squat” simplu înseamnă genuflexiunea cu bara pe spate, ca în aplicațiile sursă.
- Exercițiile proprii cu același nume se refolosesc. Cele fără potrivire devin exerciții proprii noi: echipamentul se deduce din nume, tipul din serii (cronometrat, greutatea corpului, cu greutate), grupa din FitNotes (Category) sau, dacă lipsește, o alege utilizatorul înainte de import.
- Greutatea se convertește în kilograme dacă fișierul e în livre (`lb × 0,45359237`). Hevy și FitNotes spun unitatea; la Strong o alege utilizatorul.
- Încălzirea (`set_type: warmup` la Hevy, `W` la Strong) rămâne încălzire. RPE 6-10 se păstrează cu `effort_scale: 'rpe'`.
- Seriile fără repetări și fără durată (cardio pe distanță) se sar și se numără în previzualizare.
- Antrenamentele fără oră de sfârșit primesc durata din fișier (Strong) sau o estimare de 1,5 minute pe serie, minim 20 de minute.

## Coloane folosite

| Sursă | Coloane |
| --- | --- |
| Hevy | `title`, `start_time`, `end_time`, `description`, `exercise_title`, `set_type`, `weight_kg` / `weight_lbs`, `reps`, `duration_seconds`, `rpe` |
| Strong | `Date`, `Workout Name`, `Duration`, `Exercise Name`, `Set Order`, `Weight`, `Reps`, `Seconds`, `Workout Notes`, `RPE` |
| FitNotes | `Date`, `Exercise`, `Category`, `Weight` + `Weight Unit` (sau `Weight (kgs)` / `Weight (lbs)`), `Reps`, `Time` |

## Ce nu face încă

- Greutatea corporală (de ex. din Apple Health).
- Rutinele din aplicațiile sursă: se importă doar antrenamentele făcute.
- API-ul Hevy Pro.
