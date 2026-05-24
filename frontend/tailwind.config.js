/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#050705',
          1: '#111311',
          2: '#171817',
          3: '#1d1f1d',
          4: '#242824',
          5: '#2d332e',
        },
        surface: '#111311',
        border: { DEFAULT: 'rgba(255,255,255,0.08)', hover: 'rgba(255,255,255,0.14)', active: 'rgba(0,200,150,0.45)' },
        text: { primary: '#f4f5f2', secondary: '#a2a59f', tertiary: '#61665f' },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        glow: '0 0 30px rgba(0,200,150,0.18)',
      },
    },
  },
  plugins: [],
};
