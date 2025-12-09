/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#8b5cf6',
          800: '#6b21a8',
          900: '#581c87',
        },
        background: '#0f172a',
        surface: 'rgba(30, 41, 59, 0.6)',
        'surface-solid': '#1e293b',
        'surface-light': '#334155',
      },
    },
  },
  plugins: [],
};
