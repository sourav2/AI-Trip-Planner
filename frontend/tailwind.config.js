/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#16A34A',
          dark: '#111111',
          text: '#111827',
          muted: '#6B7280',
          softBg: '#F8FAF8',
          borders: '#E5E7EB',
          success: '#22C55E',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
        travel: {
          bg: {
            white: '#FFFFFF',
            soft: '#F8FAF8',
            gray: '#FAFAFA'
          },
          text: {
            primary: '#111827',
            secondary: '#1F2937',
            muted: '#6B7280'
          },
          button: {
            dark: '#111111',
            darkHover: '#1F2937',
            blue: '#16A34A',
            blueHover: '#15803D'
          },
          accent: {
            blue: '#E8F5E9',
            green: '#E8F5E9',
            warm: '#F0FDF4',
            gray: '#E5E7EB'
          }
        }
      },
      boxShadow: {
        'premium': '0px 14px 18px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0px 18px 24px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        display: ['Sora', 'sans-serif'],
        heading: ['Sora', 'sans-serif'],
      },
      scale: {
        '102': '1.02',
      },
      transitionProperty: {
        'premium': 'transform, box-shadow',
      }
    },
  },
  plugins: [],
}
