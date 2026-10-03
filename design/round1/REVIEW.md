# Runda 1: machete în cod (fără model de imagine)

Gemini API nu are cotă gratuită pentru imagini (limită 0 pe toate modelele, verificat pe
3 Pro, 3.1 Flash Lite și 2.5 Flash), așa că utilizatorul a ales varianta 2: ecranele făcute
direct în HTML după brief, cu token-urile temei din PR #10. Cost: 0.

Surse: `design/mockups/build.py` (generează paginile), `style.css` (token-uri), font Inter
local (`fonts/`, licență OFL). Capturi la 390 px lățime, 2x, pagina întreagă.

| Ecran | Deschis | Închis |
|---|---|---|
| Acasă | 01-home-light.png | 01-home-dark.png |
| Antrenament activ | 02-workout-light.png | 02-workout-dark.png |
| Nutriție, Jurnal | 03-nutrition-light.png | 03-nutrition-dark.png |

## Față de brief
- Toate elementele listate sunt prezente, în ordine, cu textul exact.
- Adăugat față de brief: linkul „Jurnal” pe cardul de nutriție de pe Acasă și rândul
  „Mai ai 560 kcal pentru azi” în Jurnal. De confirmat sau de scos.
- Machetele sunt mai lungi decât un ecran de telefon (până la ~1 130 pt); pe telefon se
  derulează, iar bara de jos rămâne fixă.

## De discutat la review
- Accentele pe secțiuni (dunga colorată din stânga) sunt destul de discrete?
- Tabelul de seturi: cifrele mari și bifa verde plină sunt ce vrei în sală?
- Nutriție: un card pe masă sau o listă continuă?
