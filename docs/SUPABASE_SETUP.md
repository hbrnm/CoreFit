# Supabase de la zero (cont nou)

Supabase dă contul și sincronizarea între dispozitive. Fără el, CoreFit merge în mod local: datele stau doar pe telefon.
Configurarea durează cam 10 minute.

## 1. Cont și proiect

1. Intră pe [supabase.com](https://supabase.com) → **Start your project** → creează contul (cu email sau GitHub).
2. **New project**:
   - **Name:** `corefit`
   - **Database password:** generează una și păstreaz-o (nu e nevoie de ea în aplicație).
   - **Region:** `Central EU (Frankfurt)`, cea mai apropiată de România.
   - Planul **Free** ajunge.
3. Așteaptă 1-2 minute până proiectul e gata.

## 2. Baza de date

1. În proiect: **SQL Editor** → **New query**.
2. Copiază tot conținutul fișierului [`supabase/setup.sql`](../supabase/setup.sql) și apasă **Run**.
3. Trebuie să apară „Success. No rows returned”. În **Table Editor** apar 13 tabele: `user_profiles`, `workout_sessions`, `workout_logs`, `routines` etc.

Fișierul conține toate migrațiile din `supabase/migrations/`, în ordine. E sigur să-l rulezi de mai multe ori.
Verificat pe Postgres 16: tabelele, cele 39 de politici RLS, profilul creat automat la înscriere și faptul
că un utilizator nu vede și nu poate scrie datele altuia.

## 3. Autentificare

**Authentication → Sign In / Providers → Email**: trebuie să fie activ (e activ implicit).
„Confirm email” poate rămâne pornit: la înscriere, aplicația spune că trebuie confirmat emailul.

**Authentication → URL Configuration**:
- **Site URL:** adresa la care deschizi aplicația, de exemplu `https://core-six-tau.vercel.app`.
  Linkul din emailul de confirmare duce aici.
- **Redirect URLs:** adaugă aceeași adresă, plus `http://localhost:8080` pentru dezvoltare.

## 4. Cheile pentru aplicație

**Project Settings → API Keys** (sau **Connect**):
- **Project URL**, de forma `https://abcdefgh.supabase.co`
- **anon / publishable key**, cheia publică

Cheia publică poate sta în aplicație: datele sunt protejate de politicile RLS, nu de cheie.
**Nu** folosi cheia `service_role` / `secret` în aplicație.

## 5. Vercel

În proiectul Vercel care publică aplicația → **Settings → Environment Variables**, pentru Production și Preview:

| Nume | Valoare |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_ANON_KEY` | cheia publică |

Apoi **Deployments → Redeploy** pe ultima publicare. Variabilele `VITE_` intră în aplicație doar la build.

Local: copiază `.env.example` în `.env.local`, completează aceleași două valori, apoi `npm run dev`.

## 6. Verificare

1. Deschide aplicația. Ecranul de start trebuie să ceară email și parolă, nu doar „mod local”.
2. Creează un cont, confirmă emailul, conectează-te.
3. Adaugă o greutate în Nutriție. În Supabase → **Table Editor → daily_nutrition_logs** apare rândul tău în câteva secunde.
4. Pe al doilea dispozitiv, conectat cu același cont, apare aceeași greutate.

## Datele din modul local

Ce ai notat în mod local nu se mută singur în cont. Înainte să te conectezi: **Profil → Date → Descarcă o copie**.
După conectare: **Restaurează dintr-o copie** cu același fișier.

## Schimbări ulterioare ale bazei

Migrațiile noi se adaugă în `supabase/migrations/`, apoi `npm run supabase:setup` regenerează `supabase/setup.sql`.
Un test pică dacă fișierul rămâne în urmă. Pe un proiect existent se rulează doar migrația nouă, în SQL Editor.
