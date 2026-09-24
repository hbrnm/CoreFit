# Import Hevy, Strong, FitNotes

Nu este implementat. Acesta este planul pentru un import CSV, fără API extern.

## Principii

- Fișierul se citește pe dispozitiv. Nu pleacă nicăieri.
- Se creează sesiuni și serii CoreFit, cu `user_id` al contului curent.
- Exercițiile necunoscute devin exerciții proprii, nu se inventează un id din catalog.
- Un import repetat nu dublează: cheia este sursa + id-ul extern al seriei, păstrat într-un câmp `import_key`.
- Greutatea se convertește în kilograme dacă fișierul este în livre (`lb * 0.45359237`).
- RPE se păstrează în `rpe` cu `effort_scale: 'rpe'`. RIR, dacă există, cu `effort_scale: 'rir'`.
- Încălzirea rămâne `set_type: 'warmup'` și nu intră în progresie sau în 1RM.
- Rutinele importate sunt copii independente, nu înlocuiesc planul săptămânal.
- Greutatea corporală merge în `daily_nutrition_logs.body_weight_kg` pentru data respectivă, fără să șteargă apa sau notele zilei.

## Mapare

| Sursă | CoreFit |
| --- | --- |
| dată + oră antrenament | `workout_sessions.started_at`, `ended_at` dacă există durată |
| nume antrenament | `workout_sessions.name` |
| nume exercițiu | potrivire exactă, apoi normalizată, pe catalogul builtin; altfel `custom_exercises` |
| grupă, dacă există | `muscle` doar dacă e una din cele 10 grupe CoreFit |
| set, greutate, repetări | `workout_logs` |
| secunde | `reps` la exercițiile cu durată |
| RPE / RIR | `rpe` + `effort_scale` |
| notă | `notes` pe sesiune sau ignorată dacă nu există un câmp pe serie |
| rutină / folder | `routines`, exercițiile în ordinea din fișier |
| greutate corporală | `body_weight_kg` pe zi |

## CSV-uri tipice

- **Hevy:** `title`, `start_time`, `end_time`, `exercise_title`, `set_index`, `weight_kg`, `reps`, `rpe`, `distance_km`, `duration_seconds`.
- **Strong:** `Date`, `Workout Name`, `Exercise Name`, `Set Order`, `Weight`, `Reps`, `RPE`, unitate în antet sau în coloană.
- **FitNotes:** `Date`, `Exercise`, `Category`, `Weight`, `Reps`, `Unit`.

Prima implementare citește un singur CSV, arată câte sesiuni și câte exerciții necunoscute ar rezulta, apoi cere confirmare. Nu se apelează API-ul Hevy.
