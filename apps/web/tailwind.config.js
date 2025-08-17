/** @type {import('tailwindcss').Config} */
module.exports = {
  ...require('@cebu-health/config/tailwind'),
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/components/**/*.{js,ts,jsx,tsx}',
  ],
};