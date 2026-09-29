/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F1A2B',
          900: '#0A1220',
          800: '#0F1A2B',
          700: '#182742',
          600: '#233457',
        },
        paper: {
          DEFAULT: '#F6F7F5',
          muted: '#ECEEEA',
        },
        vault: {
          teal: '#2E6F5E',
          tealDark: '#20503F',
          amber: '#B8873A',
          rust: '#B0472F',
        },
        line: '#E2E5E0',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15,26,43,0.04), 0 8px 24px rgba(15,26,43,0.06)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
};
