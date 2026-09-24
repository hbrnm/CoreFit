# Raport de Audit: Aplicație CoreFit (Fitness, Nutriție & Sănătate)

## 1. Executive Summary
**Scor general de maturitate: 6.5 / 10**

Aplicația prezintă o fundație solidă (React, Vite PWA, Dexie pentru offline-first, Supabase pentru sincronizare), însă poartă amprenta tipică a codului generat de agenți AI: componente aglomerate cu multiple responsabilități, logici de validare manuale, și scăpări importante de performanță și securitate. Arhitectura offline-first este funcțională, însă interogările locale nescalabile și lipsa conformității GDPR (lipsa ștergerii contului) reprezintă riscuri majore care împiedică lansarea în producție.

---

## 2. Top 5 Probleme Critice (Blockers)

1. **Lipsa Conformității GDPR și a Politicilor App Store (Account Deletion)**
   - *Problema:* Nu există niciun flux prin care utilizatorul să-și poată șterge contul și datele medicale asociate.
   - *Impact:* Blocare la publicarea în App Store / Google Play și amenzi de conformitate GDPR.
2. **Performanță și Securitate RLS în Supabase (Anti-pattern)**
   - *Problema:* Politicile RLS folosesc subquery-uri `(select auth.uid())` în loc de funcția nativă `auth.uid()`.
   - *Impact:* Scădere masivă de performanță în producție din cauza lipsei de cache pe contextul sesiunii, putând duce la timeouts pe tabele mari.
3. **Memory Leaks / Interogări Ineficiente (Local Database)**
   - *Problema:* Interogări în Dexie (ex. pentru a lua ultima greutate în `Diary.tsx`) extrag tot tabelul `nutritionLogs` în memorie (RAM) cu `.toArray()` și fac sortare în JavaScript.
   - *Impact:* Aplicația va deveni lentă și va crăpa (OOM) după câteva luni de utilizare.
4. **Design Flaw în React Hook-ul `useLive`**
   - *Problema:* Serializarea dependențelor folosind `JSON.stringify(deps)` în `useLive.ts`.
   - *Impact:* Re-renderizări excesive și blocaje de performanță (O(N) la fiecare render) dacă obiectele devin complexe, plus posibilitatea de crash la referințe circulare.
5. **Inconsistență în validarea Datelor de Sănătate**
   - *Problema:* Fallback-uri "hardcoded" la greutate (ex. `weightKg ?? 70` pentru calcul proteine) și lipsa validării limitelor extreme (ex. calorii negative rezultate din ecuații, cantități nerealiste) în formularele manuale din UI.
   - *Impact:* Calcule de nutriție eronate care pot afecta negativ sănătatea utilizatorului (ex. macronutrienți negativi, ținte calorice periculoase).

---

## 3. Raport Detaliat pe Categorii

### 1. AUDIT TEHNIC ȘI ARHITECTURĂ (Codebase & Performance)
🔴 **Critical:** Extragerea completă a datelor în RAM
- *Locația:* `corefit/src/features/nutrition/Diary.tsx` (ex: `db.nutritionLogs.where('user_id').equals(userId).toArray()`)
- *Soluția:* Folosiți interogări optimizate cu limită: `db.nutritionLogs.where('[user_id+log_date]').between([userId, ''], [userId, '\uffff']).reverse().limit(1).toArray()`.
🔴 **Critical:** Hook-ul reactiv de stare (`useLive.ts`) folosește serializare ineficientă
- *Locația:* `corefit/src/hooks/useLive.ts` (`const key = JSON.stringify(deps);`)
- *Soluția:* Utilizați mecanisme native React (ex. hook-ul oficial `useLiveQuery` de la `dexie-react-hooks`) pentru a gestiona subscripțiile fără parsare repetată a dependențelor.
🟡 **Medium:** Cod Duplicat și Dependențe Neutilizate
- *Locația:* `package.json` din root.
- *Soluția:* Proiectul root conține zeci de pachete neutilizate de PWA-ul final (TanStack Router, React Query, etc.). Curățați `package.json` din root pentru a reflecta stack-ul real din folderul `corefit/`.
🟡 **Medium:** Componente "God Class" (Fat Components)
- *Locația:* `Diary.tsx`, `AddFoodSheet.tsx`.
- *Soluția:* Spargeți UI-ul în componente mai mici. Logica de preluare a datelor (Data Fetching) trebuie mutată în hook-uri specializate, lăsând UI-ul responsabil doar de render.

### 2. SECURITATE, PRIVACY ȘI COMPLIANCE (Health Data Safety)
🔴 **Critical:** Subquery în Supabase Row Level Security
- *Locația:* `corefit/supabase/migrations/20260920000001_create_fitness_schema.sql` (și versiunea v2)
- *Soluția:* Înlocuiți `using (user_id = (select auth.uid()))` cu `using (user_id = auth.uid())`. Subquery-ul ignoră caching-ul intern al Postgres-ului pentru variabile de sesiune.
🔴 **Critical:** Lipsa posibilității de a șterge contul (GDPR)
- *Locația:* `useAuth.ts` și UI-ul aplicației.
- *Soluția:* Adăugați o funcție RPC în Supabase care șterge user-ul din `auth.users` și apelați-o din setările de profil (ex. buton "Șterge contul permanent").
🟡 **Medium:** Criptarea datelor la nivel local
- *Locația:* `db.ts` (Dexie)
- *Soluția:* Pentru o aplicație medicală, este recomandată adăugarea unei soluții de encriptare pentruIndexedDB (ex. folosind un master key derivat din parola utilizatorului), mai ales dacă dispozitivul este shared.

### 3. UX / UI ȘI EXPERIENȚA UTILIZATORULUI
🟡 **Medium:** Validare Manuală și Eroare UX pe Formulare
- *Locația:* `AddFoodSheet.tsx` (Validări cu if-else și `parseDecimal`)
- *Soluția:* Implementați validări robuste utilizând `react-hook-form` + `zod` (pachete care deja se regăsesc în structura voastră) pentru a afișa mesaje de eroare specifice la nivelul câmpurilor (inline validation), nu doar mesaje generice sus.
🟡 **Low:** Stări de Empty / Loading inexistente
- *Locația:* Componentele care folosesc `useLive`
- *Soluția:* Implementați Skeletons. Când `loaded` e false în `useLive`, interfața ar trebui să arate un placeholder vizual pentru a evita săriturile bruște (Layout Shifts) ale ecranului (Cumulative Layout Shift).

### 4. LOGICĂ DE BUSINESS ȘI CALCUL SĂNĂTATE/NUTRIȚIE
🔴 **High:** Fallback periculos pentru greutate și calcule negative de macronutrienți
- *Locația:* `corefit/src/lib/nutrition.ts` (`const protein = Math.round((weightKg ?? 70) * PROTEIN_G_PER_KG);`)
- *Soluția:* O lipsă a datelor (greutate = null) ar trebui să împiedice calculul și să returneze o cerință de input din partea utilizatorului. Nu folosiți hardcoding la `70kg`.
- *Soluția 2:* Dacă se alege un aport de calorii extrem de mic, carbohidrații pot fi forțați la 0, iar proteinele + grăsimile pot depăși ținta calorică. Implementați o normalizare a procentajelor macronutrienților astfel încât suma lor de calorii să nu o poată depăși niciodată pe cea totală.

---

## 4. Action Plan (Lista de priorități)

### SPRINT 1 (Blockers & Hotfixes)
1. **Remedierea RLS-ului în Supabase:** Rescrieți migrările / actualizați politicile RLS pentru a folosi exclusiv `auth.uid()`.
2. **Implementarea Account Deletion:** Creați o funcție Edge sau RPC în Supabase și adăugați fluxul de ștergere în UI-ul de profil.
3. **Optimizarea Interogărilor Dexie:** Refactorizați `.toArray()` în metode care folosesc limite, range-uri și indecși corecți (`.limit(1)`, `.first()`).

### SPRINT 2 (UX, Refactoring & Business Logic)
4. **Refactorizarea `useLive.ts`:** Integrați `dexie-react-hooks` pentru a scăpa de `JSON.stringify(deps)`.
5. **Siguranța Formularelor (Forms & Validation):** Mutați validările din manual state (`useState`) în `react-hook-form` cu o schemă `Zod` pentru toate formularele aplicației (Calorii, Nutriție, Sign up).
6. **Corectarea Calculelor TDEE/BMR:** Adăugați edge-case handling logic pentru input-uri goale / extreme și eliminați magic numbers (`70kg`).

### SPRINT 3 (Tech Debt & Polish)
7. **Curățarea Dependențelor:** Ștergeți fișierele root din afara workspace-ului efectiv sau actualizați `package.json`-ul corect pentru a nu deruta viitorii developeri.
8. **UI/UX Skeletons:** Adăugați animații de încărcare pentru interogările asincrone.
9. **Modularizare UI:** Extrageți sub-componentele din `Diary.tsx` în fișiere dedicate din folderul `components/`.
