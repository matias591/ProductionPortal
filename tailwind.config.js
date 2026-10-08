/** @type {import('tailwindcss').Config} */
// BizzApps palette (shared with Sequence Builder / Quote Builder / Travel Overview).
// slate + blue are remapped so every existing utility inherits the brand without per-page edits.
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: '#2f7cf6',
        navy: '#0c1f4b',
        slate: {
          50: '#f5f7fb',
          100: '#eef2f9',
          200: '#e4e9f2',
          300: '#cfd8e8',
          400: '#9aa7c2',
          500: '#6b7a99',
          600: '#41507a',
          700: '#2c3a63',
          800: '#1a2850',
          900: '#0c1f4b',
        },
        blue: {
          50: '#e8f0fe',
          100: '#d9e6fd',
          200: '#bcd3fb',
          300: '#8fb6f9',
          400: '#5d97f7',
          500: '#2f7cf6',
          600: '#2a6fe0',
          700: '#2260c4',
          800: '#16306b',
          900: '#0c1f4b',
        },
      },
      keyframes: {
        'bz-fade-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
      },
    },
  },
  plugins: [],
};
