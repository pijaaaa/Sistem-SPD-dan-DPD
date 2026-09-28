/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7f5',
          100: '#b3e9e2',
          200: '#80dace',
          300: '#4dccbb',
          400: '#1abda7',
          500: '#14B8A6',
          600: '#0f9688',
          700: '#0c7569',
          800: '#0a5d52',
          900: '#08463d',
          950: '#0A4D47',
        },
        teal: {
          dark: '#0A4D47',
          DEFAULT: '#0B5C54',
          light: '#14B8A6',
        },
      },
    },
  },
  plugins: [],
}