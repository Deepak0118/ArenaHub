/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"Bricolage Grotesque"', 'sans-serif'],
      },
      colors: {
        background: {
          DEFAULT: '#0D1117',
          elevated: '#131923',
          card: '#131923',
        },
        border: {
          DEFAULT: '#1F2937',
          light: '#374151',
        },
        foreground: {
          DEFAULT: '#FFFFFF',
          secondary: '#E2E8F0',
          tertiary: '#CBD5E1',
          muted: '#CBD5E1',
        },
        brand: {
          DEFAULT: '#E53935',
          light: '#EF5350',
          dark: '#C62828',
        },
        success: '#00FA9A',
        warning: '#FF8C00',
        error: '#FF3333',
        info: '#00BFFF',
      },
      keyframes: {
        slideToast: {
          '0%': { transform: 'translate(-50%, -100px)', opacity: '0' },
          '10%': { transform: 'translate(-50%, 0)', opacity: '1' },
          '90%': { transform: 'translate(-50%, 0)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -100px)', opacity: '0' },
        }
      },
      animation: {
        slideToast: 'slideToast 3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
