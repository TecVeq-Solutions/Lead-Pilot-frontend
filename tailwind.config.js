/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        '3xl': '1920px',
        '4xl': '2500px',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        darkBase: '#080C14',
        darkSurface: '#0E1524',
        darkCard: '#121A2D',
        darkBorder: '#1E2B45',
        emeraldAccent: '#10B981',
      },
      boxShadow: {
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.15)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.15)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.15)',
        'glow-amber': '0 0 25px -5px rgba(245, 158, 11, 0.15)',
        'glow-rose': '0 0 25px -5px rgba(244, 63, 94, 0.15)',
      },
    },
  },
  plugins: [],
}
