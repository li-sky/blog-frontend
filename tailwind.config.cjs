/** @type {import('tailwindcss').Config} */
const { paletteBase } = require('./styles/paletteTokens.cjs');
const steps = [50,100,200,300,400,500,600,700,800,900,950];
const paletteScale = name => Object.fromEntries(steps.map(step => [step, `rgb(var(--palette-${name}-${step}) / <alpha-value>)`]));
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: { gray: paletteScale('gray'), accent: paletteScale('accent'), canvas: 'rgb(var(--site-canvas-rgb) / <alpha-value>)', surface: 'rgb(var(--site-surface-rgb) / <alpha-value>)', foreground: 'rgb(var(--site-text-rgb) / <alpha-value>)' },
      fontFamily: {
        sans: ['sans-serif'],
        serif: ['serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss/plugin')(({ addBase }) => addBase(paletteBase()))],
};
