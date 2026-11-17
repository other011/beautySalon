/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FBF8F4',
        sand: { 50: '#F7F2EC', 100: '#F1E9DF', 200: '#E8DCCD', 300: '#D9C7B2' },
        nude: { 100: '#F3E4DA', 200: '#E6D3C3', 300: '#D8BBA6', 400: '#C9A58E', 500: '#B58B72' },
        gold: { 100: '#F4EAD6', 300: '#D4B77F', 400: '#C4A265', 500: '#B8935A', 600: '#9C7a45' },
        ink: { 900: '#242427', 800: '#2B2B2E', 700: '#3C3C41', 600: '#55555B', 500: '#76767D', 400: '#9A9AA1' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 8px 30px rgba(43, 43, 46, 0.06)',
        card: '0 2px 12px rgba(43, 43, 46, 0.05)',
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
      },
      animation: { 'fade-up': 'fade-up .5s ease-out both', 'fade-in': 'fade-in .3s ease-out both' },
    },
  },
  plugins: [],
};
