/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffc5c5',
          300: '#ff9a9a',
          400: '#ff6060',
          500: '#ff2d2d',
          600: '#e60000',
          700: '#c20000',
          800: '#9e0000',
          900: '#830000',
        },
        dark: {
          50: '#f6f6f7',
          100: '#e1e2e5',
          200: '#c3c5cc',
          300: '#9da0ab',
          400: '#777b89',
          500: '#5d606e',
          600: '#494c59',
          700: '#3c3e4a',
          800: '#1e2028',
          900: '#13141a',
          950: '#0d0e12',
        }
      }
    },
  },
  plugins: [],
}
