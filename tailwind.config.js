/** @type {import('tailwindcss').Config} */

/*
 * Culorile sunt token-uri semantice, nu nuanțe: fiecare are o valoare pentru modul deschis și una
 * pentru cel închis, definite în src/index.css ca variabile CSS (canale RGB, ca opacitatea să meargă:
 * `bg-fg/5`). Combinațiile text/fundal sunt verificate WCAG AA în src/lib/theme.test.ts.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'), // fundalul paginii
        surface: token('surface'), // carduri
        raised: token('raised'), // câmpuri, butoane discrete, elemente peste carduri
        fg: token('fg'), // text principal
        muted: token('muted'), // text secundar
        subtle: token('subtle'), // etichete, indicii, text terțiar
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        brand: { DEFAULT: token('brand'), fg: token('brand-fg') },
        'on-brand': token('on-brand'), // text pe orice fundal plin colorat (brand, *-solid)
        danger: { DEFAULT: token('danger'), solid: token('danger-solid') },
        success: { DEFAULT: token('success'), solid: token('success-solid') },
        warning: { DEFAULT: token('warning'), solid: token('warning-solid') },
        // accentele secțiunilor: iconițe, etichete, grafice, nu butoane
        workouts: token('workouts'),
        health: token('health'),
        nutrition: token('nutrition'),
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 3px rgb(var(--shadow) / 0.08)',
        sheet: '0 -8px 24px rgb(var(--shadow) / 0.18)',
      },
    },
  },
  plugins: [],
};
