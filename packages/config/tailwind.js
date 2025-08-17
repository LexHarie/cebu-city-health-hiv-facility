/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    '../../apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        'lucky-1': 'var(--color-lucky-1)',
        'lucky-2': 'var(--color-lucky-2)', 
        'lucky-3': 'var(--color-lucky-3)',
        'accent-red': 'var(--color-accent-red)'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'loading': 'loading 1.5s infinite'
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        },
        glow: {
          from: { boxShadow: '0 0 5px rgba(212, 175, 55, 0.2)' },
          to: { boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)' }
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        loading: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
        'gradient-tertiary': 'linear-gradient(135deg, #0D47A1 0%, #1976D2 100%)',
        'gradient-danger': 'linear-gradient(135deg, #E10600 0%, #FF1744 100%)'
      },
      boxShadow: {
        'glow': 'var(--shadow-glow)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};