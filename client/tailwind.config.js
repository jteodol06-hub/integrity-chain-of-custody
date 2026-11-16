/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        iccf: {
          bg: '#080D18',
          subtle: '#101827',
          card: '#151F30',
          elevated: '#1B2940',
          accent: '#38BDF8',
          accent2: '#818CF8',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
          text: '#F8FAFC',
          muted: '#94A3B8',
          border: '#263449',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
