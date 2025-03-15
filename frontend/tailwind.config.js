/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#06545E',
        secondary: {
          DEFAULT: '#1F2A44',
          gray: '#6B7280',
          light: '#E5E7EB'
        },
        hover: '#E6F0F2',
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
      },
      fontSize: {
        'heading': '24px',
        'section': '16px',
        'body': '14px',
      },
      spacing: {
        'container-padding': '24px',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
} 