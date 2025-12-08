/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", 
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: '#0176D3', // Salesforce Blue
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          900: '#0F172A',
        }
      }
    },
  },
  plugins: [],
};