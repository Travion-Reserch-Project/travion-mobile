/** @type {import('tailwindcss').Config} */
const colors = require('./src/theme/colors.js');
const spacing = require('./src/theme/spacing.js');
const typography = require('./src/theme/typography.js');

module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', '!./src/theme/**'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...colors,
    },
    extend: {
      spacing,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      fontFamily: {
        sans: ['Gilroy-Bold'],
        'gilroy-regular': ['Gilroy-Regular'],
        'gilroy-medium': ['Gilroy-Medium'],
        'gilroy-bold': ['Gilroy-Bold'],
        'gilroy-heavy': ['Gilroy-Heavy'],
      },
    },
  },
  plugins: [],
};
