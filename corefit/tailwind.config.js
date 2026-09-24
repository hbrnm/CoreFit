/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#0F172A', // Deep Slate (app background)
        panel: '#1E293B', // Charcoal Gray (cards)
        steel: '#F8FAFC', // Off-White (main text & borders via opacity)
        plate: {
          red: '#EF4444', // Crimson
          blue: '#06B6D4', // Electric Cyan
          green: '#10B981', // Neon Mint
          yellow: '#F97316', // Sunset Orange
        },
        neon: {
          mint: '#10B981',
          cyan: '#06B6D4',
          orange: '#F97316',
          crimson: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"SF Pro Display"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
