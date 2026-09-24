import type { Tab } from '../context';

/** Culorile discurilor de haltere: fiecare zonă a aplicației are culoarea ei. */
export const PLATE = {
  red: '#EF4444',    // Crimson
  blue: '#06B6D4',   // Electric Cyan
  green: '#10B981',  // Neon Mint
  yellow: '#F97316', // Sunset Orange
  steel: '#F8FAFC',  // Off-White
  chalk: '#0F172A',  // Deep Slate
  gray: '#94A3B8',   // Slate 400
} as const;

interface DomainStyle {
  label: string;
  /** bară de accent (fundal) */
  bar: string;
  /** text colorat */
  text: string;
  /** buton principal */
  solid: string;
  /** culoarea accent pentru checkbox-uri */
  accent: string;
  /** marginea panoului cu accent */
  edge: string;
}

export const DOMAIN: Record<Tab, DomainStyle> = {
  home: {
    label: 'Acasă',
    bar: 'bg-white',
    text: 'text-white',
    solid: 'bg-white text-chalk active:bg-white/85',
    accent: 'accent-white',
    edge: 'border-l-white',
  },
  workouts: {
    label: 'Antrenament',
    bar: 'bg-plate-red',
    text: 'text-plate-red',
    solid: 'bg-plate-red text-white active:bg-plate-red/85',
    accent: 'accent-plate-red',
    edge: 'border-l-plate-red',
  },
  health: {
    label: 'Sănătate',
    bar: 'bg-plate-blue',
    text: 'text-plate-blue',
    solid: 'bg-plate-blue text-white active:bg-plate-blue/85',
    accent: 'accent-plate-blue',
    edge: 'border-l-plate-blue',
  },
  nutrition: {
    label: 'Nutriție',
    bar: 'bg-plate-green',
    text: 'text-plate-green',
    solid: 'bg-plate-green text-white active:bg-plate-green/85',
    accent: 'accent-plate-green',
    edge: 'border-l-plate-green',
  },
  profile: {
    label: 'Profil',
    bar: 'bg-neon-mint',
    text: 'text-neon-mint',
    solid: 'bg-neon-mint text-chalk active:brightness-90',
    accent: 'accent-neon-mint',
    edge: 'border-l-neon-mint',
  },
};
