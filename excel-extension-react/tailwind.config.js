/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'epsilon-blue': '#0560e3',
        'epsilon-blue-dark': '#044bb3',
      }
    },
  },
  plugins: [],
}
