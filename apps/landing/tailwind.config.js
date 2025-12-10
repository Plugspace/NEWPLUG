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
          DEFAULT: '#8b5cf6',
          dark: '#7c3aed',
        },
        background: {
          DEFAULT: '#0a0a0a',
        },
      },
      animation: {
        'wave-ring': 'wave-ring 2s ease-in-out infinite',
        'sound-bar': 'sound-bar 1.5s ease-in-out infinite',
      },
      keyframes: {
        'wave-ring': {
          '0%, 100%': { opacity: 0, transform: 'scale(0.8)' },
          '50%': { opacity: 1, transform: 'scale(1)' },
        },
        'sound-bar': {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        },
      },
    },
  },
  plugins: [],
};
