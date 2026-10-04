import type { RegionId } from '../lib/db';

/*
 * Conținut de sănătate musculo-scheletală.
 * Fiecare program spune deschis de unde vine recomandarea: ghid clinic, consens de experți,
 * studii clinice sau doar recomandare generală. Sursele sunt cele citite la construirea aplicației;
 * lista nu e completă și nu înlocuiește evaluarea unui medic sau kinetoterapeut.
 */

export type EvidenceLevel = 'guideline' | 'consensus' | 'trial' | 'general';

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  guideline: 'Ghid clinic',
  consensus: 'Consens de experți',
  trial: 'Studii clinice',
  general: 'Recomandare generală',
};

export const REGIONS: ReadonlyArray<{ id: RegionId; label: string }> = [
  { id: 'neck', label: 'Cervical (gât)' },
  { id: 'thoracic', label: 'Toracal (mijlocul spatelui)' },
  { id: 'lower_back', label: 'Lombar (zona de jos a spatelui)' },
  { id: 'shoulder', label: 'Umăr' },
  { id: 'hip', label: 'Șold' },
  { id: 'knee', label: 'Genunchi' },
  { id: 'ankle_foot', label: 'Gleznă și picior' },
  { id: 'other', label: 'General' },
];

/** Cele trei zone ale coloanei, de sus în jos. */
export const SPINE_ZONES: readonly RegionId[] = ['neck', 'thoracic', 'lower_back'];

export const REGION_LABELS = Object.fromEntries(REGIONS.map((r) => [r.id, r.label])) as Record<RegionId, string>;

export interface Source {
  label: string;
  detail: string;
  url?: string;
}

export interface ProgramExercise {
  id: string;
  name: string;
  how: string;
  /** reps = repetări, hold = menținere cronometrată */
  kind: 'reps' | 'hold';
  sets: number;
  reps?: number;
  holdS?: number;
  restS: number;
  /** se face pe rând pe partea stângă și pe cea dreaptă */
  perSide?: boolean;
  /** zona lucrată, când diferă de zona programului (extensia toracală din programul pentru gât) */
  zone?: RegionId;
  progress?: string;
}

export interface HealthProgram {
  id: string;
  region: RegionId;
  title: string;
  forWhom: string;
  evidence: EvidenceLevel;
  /** ce spune dovada, în propoziții scurte */
  summary: string[];
  /** ce nu e recomandat, când sursa spune explicit */
  notRecommended?: string[];
  frequency: string;
  painRule: string;
  exercises: ProgramExercise[];
  redFlags: string[];
  sources: Source[];
  /** programul are un ecran dedicat, nu cel generic */
  special?: 'mcgill';
}

const PAIN_RULE =
  'Un disconfort ușor (până la 4 din 10) e acceptabil dacă se liniștește în 24 de ore. Dacă durerea crește clar, apare la repaus sau e mai rea a doua zi dimineață, oprește-te și scade încărcarea. Este o regulă practică, adaptată din modelul de monitorizare a durerii descris pentru tendinopatii.';

const SEE_DOCTOR_ANYTIME = 'Durere intensă după o cădere sau o lovitură, febră, sau umflătură caldă și roșie a unei articulații.';

export const PROGRAMS: HealthProgram[] = [
  {
    id: 'lower-back-basic',
    region: 'lower_back',
    title: 'Lombar: mișcare de bază',
    forWhom: 'Durere lombară nespecifică, recentă sau persistentă, fără semnele de alarmă de mai jos.',
    evidence: 'guideline',
    summary: [
      'Ghidul NICE NG59 pune exercițiul în centrul tratamentului: program biomecanic, aerobic, mind-body sau o combinație, ales după preferințe și posibilități.',
      'Recomandă să rămâi activ și să-ți continui activitățile obișnuite pe cât posibil.',
      'Terapia manuală sau psihologică se ia în calcul doar împreună cu exercițiul, nu singură.',
    ],
    notRecommended: [
      'NICE recomandă să nu se ofere pentru lombalgia nespecifică: centuri sau corsete, tracțiune, electroterapie și acupunctură.',
    ],
    frequency: 'Zilnic sau de 3-5 ori pe săptămână, 10-20 de minute.',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'walk-5',
        name: 'Mers liber',
        how: 'Mers într-un ritm confortabil. Poți face pauze. Scopul e să te miști, nu să te forțezi.',
        kind: 'hold',
        sets: 1,
        holdS: 300,
        restS: 0,
      },
      {
        id: 'cat-camel',
        name: 'Pisică și cămilă',
        how: 'În patru labe. Rotunjește ușor spatele, apoi arcuiește-l ușor, lent, doar cât e confortabil.',
        kind: 'reps',
        sets: 2,
        reps: 10,
        restS: 20,
      },
      {
        id: 'glute-bridge',
        name: 'Pod cu fesierii',
        how: 'Întins pe spate, genunchii îndoiți. Ridică bazinul strângând fesierii, fără să arcuiești lombarul. Coboară controlat.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        restS: 30,
      },
      {
        id: 'bird-dog',
        name: 'Bird-dog',
        how: 'În patru labe. Întinde brațul și piciorul opus, paralele cu podeaua, fără să răsucești trunchiul.',
        kind: 'reps',
        sets: 2,
        reps: 6,
        perSide: true,
        restS: 20,
      },
      {
        id: 'side-plank-knees',
        name: 'Plank lateral din genunchi',
        how: 'Culcat pe o parte, sprijin pe cot și pe genunchi. Ridică bazinul și ține corpul aliniat.',
        kind: 'hold',
        sets: 2,
        holdS: 15,
        perSide: true,
        restS: 20,
        progress: 'Când ți se pare ușor, fă-l din picioare întinse.',
      },
      {
        id: 'sit-to-stand',
        name: 'Ridicare de pe scaun',
        how: 'Așază-te pe marginea scaunului, ridică-te fără să te sprijini cu mâinile, apoi așază-te controlat.',
        kind: 'reps',
        sets: 2,
        reps: 10,
        restS: 30,
      },
      {
        id: 'hip-hinge',
        name: 'Aplecat din șold (hip hinge)',
        how: 'Stai în picioare, împinge șoldurile în spate cu coloana neutră, ca și cum ai închide o ușă cu fesierii. Revino strângând fesierii.',
        kind: 'reps',
        sets: 2,
        reps: 10,
        restS: 30,
      },
    ],
    redFlags: [
      'Amorțeală în zona dintre picioare sau la șa, sau probleme noi cu urinarea ori scaunul.',
      'Slăbiciune care se accentuează într-un picior sau ambele.',
      'Durere după un traumatism important, sau durere constantă noaptea, care nu se schimbă cu poziția.',
      'Febră, scădere în greutate fără motiv, sau un istoric de cancer.',
    ],
    sources: [
      {
        label: 'NICE NG59',
        detail: 'Low back pain and sciatica in over 16s: assessment and management (2016, actualizat).',
        url: 'https://www.nice.org.uk/guidance/ng59',
      },
      {
        label: 'BMJ 2017;356:i6748',
        detail: 'Rezumat al ghidului NICE pentru lombalgie și sciatică.',
        url: 'https://doi.org/10.1136/bmj.i6748',
      },
    ],
  },
  {
    id: 'lower-back-mcgill',
    region: 'lower_back',
    title: 'Big 3 McGill',
    forWhom: 'Rezistența trunchiului: curl-up, side bridge și bird-dog, în piramidă 6-4-2.',
    evidence: 'general',
    summary: [
      'Este o metodă clinică populară (Stuart McGill) de a construi rezistența trunchiului cu poziții menținute.',
      'Ghidurile pentru lombalgie nespecifică nu indică un tip de exercițiu superior altuia; Big 3 e una dintre variantele posibile, potrivită dacă îți place și o poți face constant.',
    ],
    frequency: 'De 3-7 ori pe săptămână, când corpul o tolerează.',
    painRule: PAIN_RULE,
    exercises: [],
    redFlags: [
      'Aceleași semne de alarmă ca la programul de mișcare de bază: amorțeală la șa, probleme noi cu urinarea sau scaunul, slăbiciune care se accentuează.',
    ],
    sources: [
      {
        label: 'NICE NG59',
        detail: 'Nu recomandă un tip anume de exercițiu; sprijină programe biomecanice, aerobice, mind-body sau combinate.',
        url: 'https://www.nice.org.uk/guidance/ng59',
      },
      {
        label: 'S. McGill, Low Back Disorders',
        detail: 'Sursa metodei Big 3 și a piramidei 6-4-2 (carte, Human Kinetics).',
      },
    ],
    special: 'mcgill',
  },
  {
    id: 'neck-basic',
    region: 'neck',
    title: 'Gât și partea de sus a spatelui',
    forWhom: 'Durere de gât nespecifică, legată de poziții prelungite sau de efort, fără semne neurologice.',
    evidence: 'guideline',
    summary: [
      'Ghidul JOSPT 2017 pentru durerea de gât recomandă exerciții pentru mușchii gâtului și ai omoplaților (întărire, rezistență, coordonare), împreună cu educație și un stil de viață activ.',
      'O meta-analiză pe angajați de birou a găsit că exercițiile de întărire scad durerea față de lipsa exercițiului (dovadă de nivel II; efectul asupra calității vieții a fost mai puțin clar).',
    ],
    frequency: 'Mobilitate zilnic; întărire de 3 ori pe săptămână.',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'chin-tuck',
        name: 'Retracția bărbiei',
        how: 'Așezat drept, trage bărbia ușor înapoi, ca și cum ai face o bărbie dublă, fără să înclini capul. Menține 5 secunde la fiecare repetare.',
        kind: 'reps',
        sets: 2,
        reps: 10,
        restS: 20,
      },
      {
        id: 'neck-isometric',
        name: 'Izometrie pentru gât',
        how: 'Împinge ușor cu palma în frunte, apoi în ceafă, apoi în lateral, fără să miști capul. Fă o menținere pe fiecare direcție (4 serii).',
        kind: 'hold',
        sets: 4,
        holdS: 8,
        restS: 10,
      },
      {
        id: 'band-row',
        zone: 'thoracic',
        name: 'Tracțiuni cu bandă elastică',
        how: 'Trage banda spre piept, apropiind omoplații fără să ridici umerii.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        restS: 45,
      },
      {
        id: 'thoracic-ext',
        zone: 'thoracic',
        name: 'Extensie toracală peste spătar',
        how: 'Așezat, mâinile la ceafă, arcuiește ușor partea de sus a spatelui peste spătarul scaunului. Mișcarea vine din zona toracală, nu din gât.',
        kind: 'reps',
        sets: 2,
        reps: 8,
        restS: 20,
      },
      {
        id: 'neck-rotation',
        name: 'Rotații ale gâtului',
        how: 'Întoarce lent capul spre un umăr, cât e confortabil, apoi spre celălalt.',
        kind: 'reps',
        sets: 2,
        reps: 8,
        perSide: true,
        restS: 15,
      },
    ],
    redFlags: [
      'Slăbiciune, amorțeală sau furnicături în brațe sau mâini care se accentuează.',
      'Dificultăți la mers, pierderea echilibrului sau a dexterității mâinilor.',
      'Durere de cap severă și bruscă, febră, sau durere după un accident.',
    ],
    sources: [
      {
        label: 'JOSPT 2017;47(7):A1-A83',
        detail: 'Blanpied et al., Neck Pain: Revision 2017, ghid de practică clinică.',
        url: 'https://doi.org/10.2519/jospt.2017.0302',
      },
      {
        label: 'S Afr J Physiother 2017;73(1):1-11',
        detail: 'Louw et al., Effectiveness of exercise in office workers with neck pain: a systematic review and meta-analysis.',
        url: 'https://doi.org/10.4102/sajp.v73i1.392',
      },
    ],
  },
  {
    id: 'shoulder-rotator-cuff',
    region: 'shoulder',
    title: 'Umăr: coafa rotatorilor',
    forWhom: 'Durere de umăr la ridicarea brațului sau noaptea, fără traumatism recent (durere legată de coafa rotatorilor).',
    evidence: 'guideline',
    summary: [
      'Exercițiul și educația sunt tratamentul de primă linie pentru durerea de umăr legată de coafa rotatorilor (ghidul JOSPT 2025).',
      'O sinteză din 2024 arată că exercițiul funcționează, dar nu există consens despre ce tip anume e mai bun; conțin de obicei întărirea coafei și a omoplaților, cu progresie treptată.',
    ],
    frequency: '3-5 zile pe săptămână, 15-25 de minute, timp de cel puțin 12 săptămâni.',
    painRule:
      'Un disconfort ușor spre moderat (până la 4-5 din 10) e de obicei acceptat în timpul exercițiilor, dacă se liniștește în 24 de ore. Dacă durerea devine puternică sau e mai rea a doua zi, scade încărcarea. Regulă practică, adaptată din modelul de monitorizare a durerii.',
    exercises: [
      {
        id: 'pendulum',
        name: 'Mișcări pendulare',
        how: 'Aplecat, cu mâna sănătoasă sprijinită, lasă brațul dureros să atârne și fă cercuri mici, relaxat.',
        kind: 'hold',
        sets: 2,
        holdS: 30,
        restS: 10,
      },
      {
        id: 'er-isometric',
        name: 'Rotație externă izometrică',
        how: 'Cu cotul la 90 de grade lângă corp, împinge cu dosul mâinii într-un perete, fără să miști brațul. Menține.',
        kind: 'hold',
        sets: 5,
        holdS: 10,
        restS: 15,
      },
      {
        id: 'band-er',
        name: 'Rotație externă cu bandă',
        how: 'Cotul lipit de corp, la 90 de grade. Rotește antebrațul spre exterior împotriva benzii, lent, apoi revino controlat.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        restS: 45,
      },
      {
        id: 'scaption',
        name: 'Ridicare în planul omoplatului',
        how: 'Ridică brațul întins în față și lateral (aproximativ la 30 de grade față de linia laterală), până la înălțimea umărului, cu greutate mică sau fără.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        restS: 45,
      },
      {
        id: 'band-row-shoulder',
        name: 'Tracțiuni cu bandă',
        how: 'Trage banda spre piept, apropiind omoplații, cu umerii coborâți.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        restS: 45,
      },
      {
        id: 'wall-push-up-plus',
        name: 'Flotări la perete cu protracție',
        how: 'Fă o flotare la perete, iar la final împinge în plus, depărtând omoplații.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        restS: 45,
        progress: 'Progresează treptat: perete, masă, apoi podea, și adaugă greutate când poți.',
      },
    ],
    redFlags: [
      'Durere sau slăbiciune bruscă a brațului după o cădere sau o smucitură.',
      'Umăr deformat, care nu se poate mișca deloc.',
      'Durere de umăr împreună cu durere în piept, lipsă de aer sau transpirații: sună la 112.',
      SEE_DOCTOR_ANYTIME,
    ],
    sources: [
      {
        label: 'JOSPT 2025;55(4):235-274',
        detail: 'Desmeules et al., Rotator Cuff Tendinopathy: Diagnosis, Nonsurgical Medical Care, and Rehabilitation, ghid de practică clinică.',
        url: 'https://doi.org/10.2519/jospt.2025.13182',
      },
      {
        label: 'JOSPT 2024;54(8):499-512',
        detail: 'Lafrance et al., The Efficacy of Exercise Therapy for Rotator Cuff-Related Shoulder Pain According to the FITT Principle.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/38848304/',
      },
    ],
  },
  {
    id: 'hip-basic',
    region: 'hip',
    title: 'Șold: durere și artroză',
    forWhom: 'Durere de șold legată de artroză sau de slăbiciunea musculaturii din jur, fără traumatism recent.',
    evidence: 'guideline',
    summary: [
      'Ghidurile OARSI 2019 pun ca tratament de bază, pentru artroza de șold, educația și programele structurate de exerciții pe uscat.',
      'Exercițiile acvatice au fost considerate o opțiune de nivel secundar pentru genunchi; pentru șold ghidul nu le-a recomandat.',
    ],
    frequency: '2-3 ori pe săptămână, plus mers zilnic.',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'hip-sit-to-stand',
        name: 'Ridicare de pe scaun',
        how: 'Ridică-te de pe un scaun fără mâini, apoi așază-te lent. Crește dificultatea folosind un scaun mai jos.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        restS: 30,
      },
      {
        id: 'hip-bridge',
        name: 'Pod cu fesierii',
        how: 'Întins pe spate, genunchii îndoiți; ridică bazinul strângând fesierii și coboară controlat.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        restS: 30,
      },
      {
        id: 'side-lying-abduction',
        name: 'Abducție de șold pe o parte',
        how: 'Culcat pe o parte, ridică piciorul de sus întins, cu vârful drept, fără să rotești bazinul.',
        kind: 'reps',
        sets: 2,
        reps: 12,
        perSide: true,
        restS: 20,
      },
      {
        id: 'quadruped-extension',
        name: 'Extensie de șold în patru labe',
        how: 'În patru labe, împinge un picior în spate și în sus, fără să arcuiești lombarul.',
        kind: 'reps',
        sets: 2,
        reps: 10,
        perSide: true,
        restS: 20,
      },
      {
        id: 'low-step-up',
        name: 'Urcare pe treaptă joasă',
        how: 'Urcă pe o treaptă joasă apăsând cu tot piciorul, apoi coboară lent.',
        kind: 'reps',
        sets: 2,
        reps: 8,
        perSide: true,
        restS: 30,
      },
    ],
    redFlags: [
      'Durere puternică de șold după cădere, sau imposibilitatea de a călca pe picior.',
      'Durere de șold cu febră, sau articulație caldă și umflată.',
      'Durere nocturnă constantă, care nu se schimbă cu poziția, și scădere inexplicabilă în greutate.',
    ],
    sources: [
      {
        label: 'Osteoarthritis Cartilage 2019;27:1578-1589',
        detail: 'Bannuru et al., OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31278997/',
      },
    ],
  },
  {
    id: 'knee-pfp',
    region: 'knee',
    title: 'Genunchi: durere în față (femuro-patelară)',
    forWhom: 'Durere în jurul rotulei la urcat scările, ghemuit, alergat sau stat mult cu genunchii îndoiți.',
    evidence: 'consensus',
    summary: [
      'Consensul internațional din 2018 (5th International Patellofemoral Pain Research Retreat) susține terapia prin exerciții, mai ales combinația dintre exerciții pentru șold și exerciții pentru genunchi.',
      'O meta-analiză (Lack et al., 2015) a găsit că întărirea musculaturii de la nivelul șoldului este eficientă în durerea femuro-patelară.',
    ],
    frequency: '3 ori pe săptămână, timp de cel puțin 6-12 săptămâni.',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'box-squat',
        name: 'Ghemuit pe scaun',
        how: 'Coboară până atingi scaunul cu fesierii și ridică-te. Genunchii urmăresc direcția degetelor.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        restS: 45,
      },
      {
        id: 'clamshell',
        name: 'Clamshell',
        how: 'Culcat pe o parte, genunchii îndoiți, călcâiele lipite. Deschide genunchiul de sus fără să rotești bazinul.',
        kind: 'reps',
        sets: 2,
        reps: 12,
        perSide: true,
        restS: 20,
      },
      {
        id: 'knee-bridge',
        name: 'Pod cu fesierii',
        how: 'Întins pe spate, ridică bazinul strângând fesierii, coboară controlat.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        restS: 30,
      },
      {
        id: 'lateral-step-down',
        name: 'Coborâre laterală de pe treaptă',
        how: 'Stai pe o treaptă, coboară lent celălalt picior spre podea, controlând genunchiul să nu cadă spre interior.',
        kind: 'reps',
        sets: 3,
        reps: 8,
        perSide: true,
        restS: 30,
      },
      {
        id: 'wall-sit',
        name: 'Menținere cu spatele la perete',
        how: 'Cu spatele la perete, coboară până la un unghi confortabil al genunchilor și menține.',
        kind: 'hold',
        sets: 3,
        holdS: 30,
        restS: 45,
      },
      {
        id: 'single-leg-hinge',
        name: 'Aplecat din șold pe un picior',
        how: 'Pe un picior, apleacă trunchiul înainte împingând celălalt picior în spate, cu spatele drept.',
        kind: 'reps',
        sets: 2,
        reps: 8,
        perSide: true,
        restS: 30,
      },
    ],
    redFlags: [
      'Genunchi blocat (nu se poate îndrepta), sau care cedează repetat.',
      'Umflătură importantă după o răsucire sau o lovitură, sau imposibilitatea de a călca pe picior.',
      'Genunchi cald, roșu și umflat, cu febră.',
      'Durere și umflare într-o gambă, mai ales după călătorii lungi sau imobilizare: poate fi tromboză.',
    ],
    sources: [
      {
        label: 'Br J Sports Med 2018;52(18):1170-1178',
        detail: 'Collins et al., 2018 Consensus statement on exercise therapy and physical interventions to treat patellofemoral pain.',
        url: 'https://doi.org/10.1136/bjsports-2018-099397',
      },
      {
        label: 'Br J Sports Med 2015;49(21):1365-1376',
        detail: 'Lack et al., Proximal muscle rehabilitation is effective for patellofemoral pain: a systematic review with meta-analysis.',
      },
    ],
  },
  {
    id: 'knee-oa',
    region: 'knee',
    title: 'Genunchi: artroză',
    forWhom: 'Durere și rigiditate de genunchi legate de artroză, mai ales la început de mișcare sau după efort.',
    evidence: 'guideline',
    summary: [
      'Ghidurile OARSI 2019 pun ca tratament de bază educația și programele structurate de exerciții pe uscat (întărire, aerobic, echilibru), cu sau fără scădere în greutate.',
      'Exercițiile mind-body (tai chi, yoga) sunt tot tratament de bază pentru genunchi; exercițiile în apă sunt o opțiune, în funcție de alte boli.',
    ],
    frequency: 'Întărire de 2-3 ori pe săptămână, plus mișcare aerobă regulată (ținta OMS: 150 de minute pe săptămână).',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'oa-sit-to-stand',
        name: 'Ridicare de pe scaun',
        how: 'Ridică-te de pe scaun fără mâini și așază-te lent. Crește dificultatea cu un scaun mai jos.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        restS: 30,
      },
      {
        id: 'straight-leg-raise',
        name: 'Ridicare cu piciorul întins',
        how: 'Întins pe spate, un genunchi îndoit. Strânge coapsa piciorului drept și ridică-l la înălțimea celuilalt genunchi.',
        kind: 'reps',
        sets: 2,
        reps: 12,
        perSide: true,
        restS: 20,
      },
      {
        id: 'seated-knee-extension',
        name: 'Extensie de genunchi din șezut',
        how: 'Așezat, îndreaptă genunchiul lent și menține 2 secunde sus. Adaugă o bandă sau o greutate pe gleznă când devine ușor.',
        kind: 'reps',
        sets: 2,
        reps: 12,
        perSide: true,
        restS: 20,
      },
      {
        id: 'oa-bridge',
        name: 'Pod cu fesierii',
        how: 'Întins pe spate, ridică bazinul strângând fesierii și coboară controlat.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        restS: 30,
      },
      {
        id: 'single-leg-stand',
        name: 'Echilibru pe un picior',
        how: 'Sprijină-te cu degetele de un blat. Stai pe un picior, apoi încearcă fără sprijin.',
        kind: 'hold',
        sets: 2,
        holdS: 20,
        perSide: true,
        restS: 15,
      },
      {
        id: 'oa-walk',
        name: 'Mers',
        how: 'Mers într-un ritm în care poți vorbi, dar ești ușor ostenit.',
        kind: 'hold',
        sets: 1,
        holdS: 600,
        restS: 0,
      },
    ],
    redFlags: [
      'Genunchi blocat, care cedează, sau umflare bruscă după o răsucire.',
      'Genunchi cald, roșu și umflat, cu febră.',
      'Durere de genunchi care apare noaptea, la repaus, și nu se schimbă cu poziția.',
    ],
    sources: [
      {
        label: 'Osteoarthritis Cartilage 2019;27:1578-1589',
        detail: 'Bannuru et al., OARSI guidelines for the non-surgical management of knee, hip, and polyarticular osteoarthritis.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31278997/',
      },
    ],
  },
  {
    id: 'achilles',
    region: 'ankle_foot',
    title: 'Tendonul lui Ahile',
    forWhom: 'Durere la 2-6 cm deasupra călcâiului, cu rigiditate dimineața, care se liniștește după câțiva pași și revine după efort.',
    evidence: 'trial',
    summary: [
      'Încărcarea progresivă a tendonului (izometrie, ridicări pe vârfuri, apoi cu greutate) este nucleul tratamentului.',
      'Modelul de monitorizare a durerii (Silbernagel și colab., 2007) permite durere de până la 5 din 10 în timpul exercițiului, dacă se liniștește până a doua zi dimineață și nu crește de la o săptămână la alta.',
      'Programele care combină exerciții concentrice și excentrice, și cele cu încărcare mare și lentă, au dat îmbunătățiri asemănătoare; contează să poți susține progresia.',
    ],
    frequency: 'Izometrie zilnic la început; ridicările cu încărcare, de 3 ori pe săptămână.',
    painRule:
      'Durere până la 5 din 10 în timpul exercițiului e acceptabilă. Trebuie să nu se agraveze a doua zi dimineață și să nu crească de la o săptămână la alta. Altfel scade încărcarea.',
    exercises: [
      {
        id: 'ach-isometric',
        name: 'Menținere pe vârfuri (izometrie)',
        how: 'În picioare sau așezat, ridică-te pe vârfuri cam la jumătate și menține poziția, fără să cobori.',
        kind: 'hold',
        sets: 4,
        holdS: 30,
        restS: 30,
      },
      {
        id: 'ach-double-raise',
        name: 'Ridicări pe vârfuri, două picioare',
        how: 'Ridică-te lent pe vârfuri și coboară controlat, cu ambele picioare, pe podea.',
        kind: 'reps',
        sets: 3,
        reps: 15,
        restS: 45,
      },
      {
        id: 'ach-single-raise',
        name: 'Ridicări pe vârfuri, un picior',
        how: 'Pe un picior, ridică-te lent pe vârfuri și coboară controlat.',
        kind: 'reps',
        sets: 3,
        reps: 10,
        perSide: true,
        restS: 45,
        progress: 'Când 3 x 15 e ușor, fă-le pe treaptă și adaugă greutate (rucsac), tot lent.',
      },
      {
        id: 'ach-seated-raise',
        name: 'Ridicări din șezut',
        how: 'Așezat, cu genunchii la 90 de grade și o greutate pe genunchi, ridică călcâiele lent.',
        kind: 'reps',
        sets: 3,
        reps: 15,
        restS: 30,
      },
    ],
    redFlags: [
      'Pocnitură bruscă în spatele gleznei, ca o lovitură, urmată de dificultatea de a te ridica pe vârfuri: poate fi ruptură de tendon și cere evaluare urgentă.',
      'Durere de gambă cu umflare sau căldură, fără motiv: poate fi tromboză.',
      'Durere de călcâi cu febră sau roșeață.',
    ],
    sources: [
      {
        label: 'Am J Sports Med 2007;35(6):897-906',
        detail: 'Silbernagel et al., Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy.',
        url: 'https://doi.org/10.1177/0363546506298279',
      },
    ],
  },
  {
    id: 'plantar-fascia',
    region: 'ankle_foot',
    title: 'Fascia plantară (durere de călcâi)',
    forWhom: 'Durere în călcâi, mai ales la primii pași dimineața sau după ce ai stat mult.',
    evidence: 'trial',
    summary: [
      'Un studiu randomizat (Rathleff și colab., 2015, 48 de pacienți) a comparat întinderea specifică a fasciei cu antrenamentul de forță de încărcare mare: ridicări pe un picior cu un prosop sub degete, făcute la două zile.',
      'La 3 luni, grupul cu forță a avut scorul de funcție a piciorului cu 29 de puncte mai bun. La 6 și 12 luni nu au mai fost diferențe între grupuri.',
      'Concluzia practică: forța poate ajuta la reducerea mai rapidă a durerii; ambele variante ajung la rezultate asemănătoare pe termen lung.',
    ],
    frequency: 'La fiecare două zile, timp de câteva luni.',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'towel-heel-raise',
        name: 'Ridicare pe vârfuri cu prosop sub degete',
        how: 'Pune un prosop rulat sub degetele piciorului dureros, cu călcâiul pe treaptă sau pe podea. Ridică-te lent pe vârfuri, menține scurt sus, coboară lent.',
        kind: 'reps',
        sets: 3,
        reps: 12,
        perSide: true,
        restS: 60,
        progress: 'Crește treptat greutatea (rucsac) și fă mai puține repetări, tot lent.',
      },
      {
        id: 'pf-double-raise',
        name: 'Ridicări pe vârfuri, două picioare',
        how: 'Pentru început sau pentru zilele grele: ridică-te lent pe vârfuri cu ambele picioare și coboară controlat.',
        kind: 'reps',
        sets: 3,
        reps: 15,
        restS: 45,
      },
    ],
    redFlags: [
      'Durere de călcâi după o cădere sau o lovitură puternică.',
      'Amorțeală, furnicături sau arsură în talpă.',
      'Durere de călcâi la ambele picioare împreună cu dureri de articulații sau febră.',
    ],
    sources: [
      {
        label: 'Scand J Med Sci Sports 2015;25(3):e292-e300',
        detail: 'Rathleff et al., High-load strength training improves outcome in patients with plantar fasciitis: a randomized controlled trial with 12-month follow-up.',
        url: 'https://doi.org/10.1111/sms.12313',
      },
    ],
  },
  {
    id: 'desk-break',
    region: 'other',
    title: 'Pauză de mișcare (pentru cine stă mult)',
    forWhom: 'Zile lungi la birou sau la volan. Trei minute, de câteva ori pe zi.',
    evidence: 'general',
    summary: [
      'Ghidul OMS 2020 recomandă reducerea timpului sedentar la toate vârstele și abilitățile. Dovezile nu au permis să se stabilească un prag exact de ore.',
      'Ghidul afirmă că orice cantitate de activitate fizică e mai bună decât deloc.',
      'Pauzele scurte sunt o modalitate practică de a întrerupe statul; efectul lor precis asupra durerii nu are dovezi puternice.',
    ],
    frequency: 'La fiecare 30-60 de minute de stat jos.',
    painRule: PAIN_RULE,
    exercises: [
      {
        id: 'break-walk',
        name: 'Mers pe loc sau prin casă',
        how: 'Ridică-te și plimbă-te un minut.',
        kind: 'hold',
        sets: 1,
        holdS: 60,
        restS: 0,
      },
      {
        id: 'break-sit-to-stand',
        name: 'Ridicare de pe scaun',
        how: 'Ridică-te și așază-te de 10 ori, fără mâini.',
        kind: 'reps',
        sets: 1,
        reps: 10,
        restS: 0,
      },
      {
        id: 'break-thoracic',
        zone: 'thoracic',
        name: 'Extensie toracală',
        how: 'Mâinile la ceafă, arcuiește ușor partea de sus a spatelui peste spătar.',
        kind: 'reps',
        sets: 1,
        reps: 8,
        restS: 0,
      },
      {
        id: 'break-calf',
        name: 'Ridicări pe vârfuri',
        how: 'În picioare, ridică-te pe vârfuri și coboară controlat.',
        kind: 'reps',
        sets: 1,
        reps: 15,
        restS: 0,
      },
    ],
    redFlags: [SEE_DOCTOR_ANYTIME, 'Amețeală, dureri în piept sau lipsă de aer la efort: oprește-te și cere ajutor medical.'],
    sources: [
      {
        label: 'Br J Sports Med 2020;54(24):1451-1462',
        detail: 'Bull et al., World Health Organization 2020 guidelines on physical activity and sedentary behaviour.',
      },
    ],
  },
];

export function programsForRegion(region: RegionId): HealthProgram[] {
  return PROGRAMS.filter((p) => p.region === region);
}

export function programById(id: string): HealthProgram | undefined {
  return PROGRAMS.find((p) => p.id === id);
}

export const GENERAL_DISCLAIMER =
  'Informațiile din această secțiune sunt educaționale și rezumă ghiduri și studii. Nu pun diagnostice și nu înlocuiesc evaluarea unui medic sau a unui kinetoterapeut, mai ales dacă durerea e puternică, durează de săptămâni sau ai simptome de alarmă.';
