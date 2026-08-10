/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5ed',
          100: '#ffead5',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },
      boxShadow: {
        'fab': '0 10px 25px -5px rgba(234, 88, 12, 0.4)',
      },
    },
  },
  plugins: [],
};
