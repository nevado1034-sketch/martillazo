/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['Syne', 'Figtree', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
