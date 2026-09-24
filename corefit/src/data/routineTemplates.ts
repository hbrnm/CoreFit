/** [exercise_id, serii, repetări minime, repetări maxime, pauză în secunde] */
export type TemplateRow = [exerciseId: string, sets: number, repMin: number, repMax: number, restS: number];

export interface RoutineTemplate {
  id: string;
  name: string;
  level: 'Începător' | 'Intermediar';
  daysPerWeek: number;
  description: string;
  days: Array<{ name: string; rows: TemplateRow[] }>;
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'full-body-3',
    name: 'Full body',
    level: 'Începător',
    daysPerWeek: 3,
    description: 'Toată musculatura la fiecare antrenament, de trei ori pe săptămână, alternând ziua A cu ziua B.',
    days: [
      {
        name: 'A',
        rows: [
          ['back-squat', 3, 5, 8, 150],
          ['bench-press', 3, 6, 10, 120],
          ['barbell-row', 3, 8, 10, 120],
          ['overhead-press', 2, 8, 10, 90],
          ['plank', 3, 30, 45, 60],
        ],
      },
      {
        name: 'B',
        rows: [
          ['romanian-deadlift', 3, 6, 10, 150],
          ['incline-db-press', 3, 8, 12, 90],
          ['lat-pulldown', 3, 8, 12, 90],
          ['lunge', 3, 8, 12, 90],
          ['db-curl', 2, 10, 12, 60],
          ['triceps-pushdown', 2, 10, 12, 60],
        ],
      },
    ],
  },
  {
    id: 'upper-lower-4',
    name: 'Upper / Lower',
    level: 'Intermediar',
    daysPerWeek: 4,
    description: 'Două zile pentru partea de sus și două pentru partea de jos a corpului.',
    days: [
      {
        name: 'Upper A',
        rows: [
          ['bench-press', 4, 5, 8, 150],
          ['barbell-row', 4, 6, 10, 120],
          ['overhead-press', 3, 8, 10, 90],
          ['lat-pulldown', 3, 8, 12, 90],
          ['barbell-curl', 2, 10, 12, 60],
          ['triceps-pushdown', 2, 10, 12, 60],
        ],
      },
      {
        name: 'Lower A',
        rows: [
          ['back-squat', 4, 5, 8, 150],
          ['romanian-deadlift', 3, 8, 10, 120],
          ['leg-press', 3, 10, 12, 90],
          ['leg-curl', 3, 10, 12, 75],
          ['standing-calf-raise', 4, 10, 15, 60],
        ],
      },
      {
        name: 'Upper B',
        rows: [
          ['incline-db-press', 4, 8, 12, 90],
          ['seated-cable-row', 4, 8, 12, 90],
          ['db-shoulder-press', 3, 8, 12, 90],
          ['pull-up', 3, 5, 10, 120],
          ['lateral-raise', 3, 12, 15, 60],
          ['hammer-curl', 2, 10, 12, 60],
        ],
      },
      {
        name: 'Lower B',
        rows: [
          ['deadlift', 3, 3, 5, 180],
          ['bulgarian-split-squat', 3, 8, 12, 90],
          ['hip-thrust', 3, 8, 12, 90],
          ['seated-leg-curl', 3, 10, 12, 75],
          ['seated-calf-raise', 4, 12, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'ppl-3',
    name: 'Push / Pull / Legs',
    level: 'Intermediar',
    daysPerWeek: 3,
    description: 'Împingeri, tracțiuni și picioare în zile separate. Se poate repeta de două ori pe săptămână (6 zile).',
    days: [
      {
        name: 'Push',
        rows: [
          ['bench-press', 4, 5, 8, 150],
          ['overhead-press', 3, 6, 10, 120],
          ['incline-db-press', 3, 8, 12, 90],
          ['lateral-raise', 3, 12, 15, 60],
          ['triceps-pushdown', 3, 10, 12, 60],
        ],
      },
      {
        name: 'Pull',
        rows: [
          ['barbell-row', 4, 6, 10, 120],
          ['pull-up', 3, 5, 10, 120],
          ['seated-cable-row', 3, 8, 12, 90],
          ['face-pull', 3, 12, 15, 60],
          ['barbell-curl', 3, 8, 12, 60],
        ],
      },
      {
        name: 'Legs',
        rows: [
          ['back-squat', 4, 5, 8, 150],
          ['romanian-deadlift', 3, 8, 10, 120],
          ['leg-press', 3, 10, 12, 90],
          ['leg-curl', 3, 10, 12, 75],
          ['standing-calf-raise', 4, 10, 15, 60],
        ],
      },
    ],
  },
  {
    id: 'home-bodyweight',
    name: 'Acasă, fără echipament',
    level: 'Începător',
    daysPerWeek: 3,
    description: 'Un singur antrenament cu greutatea corpului, potrivit pentru început sau pentru zilele fără sală.',
    days: [
      {
        name: 'Full body',
        rows: [
          ['bodyweight-squat', 3, 10, 15, 60],
          ['push-up', 3, 6, 12, 60],
          ['glute-bridge', 3, 12, 15, 60],
          ['inverted-row', 3, 6, 12, 60],
          ['dead-bug', 3, 8, 12, 45],
          ['plank', 3, 20, 40, 45],
        ],
      },
    ],
  },
];
