# Runda 2

După deciziile 5 și 6 (`round1/USER-REVIEW.md`): stil C fără carduri pentru Pauză,
Antrenament Start, Progres și programul ghidat de Sănătate; carduri ca pe Acasă pentru
Profil și Conectare; totul monocrom, albastru doar pe acțiuni. Machete: `mockups-v2/build2.py`.

| # | Ecran | Fișiere |
|---|---|---|
| 4 | Pauză între seturi | 04-rest-light/dark.png |
| 5 | Antrenament, Start | 05-start-light/dark.png |
| 6 | Antrenament, Progres (1RM, oboseală) | 06-progress-light/dark.png |
| 7 | Sănătate, program ghidat | 07-health-light/dark.png |
| 8 | Profil | 08-profile-light/dark.png |
| 9 | Conectare | 09-login-light/dark.png |

Date noi, coerente cu runda 1: planul săptămânii (Upper A / Lower A / cardio, cu 95 min aerob
și 2 zile de forță deja făcute), 1RM 97,5 kg la împins (din 80 kg × 8), oboseală Piept și
Triceps (aceleași ca pe Acasă).

Corectat la verificare: cercurile cronometrelor arătau timpul trecut; acum arată timpul rămas.

Abateri de la ce face aplicația azi, de decis la construire:
- Pauza ca ecran întreg (azi e un panou peste antrenament).
- Programul ghidat cu cerc în loc de discul colorat (PlateTimer), pentru monocrom.
- Profilul ca listă de setări cu săgeți (azi e un formular în 4 pași).
- „Continuă fără cont” pe Conectare (azi modul local apare doar fără Supabase configurat).
