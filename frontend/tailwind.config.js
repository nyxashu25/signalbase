/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Avenir Next', 'Arial', 'sans-serif'],
      },
      colors: {
        indigo: {
          DEFAULT: '#440066',
          2: '#610091',
        },
        violet: {
          royal: '#7c00ba',
          dark: '#9400de',
          x11: '#aa00ff',
        },
        magenta: {
          hyper: '#be3dff',
        },
        mauve: {
          DEFAULT: '#dd99ff',
          magic: '#cf70ff',
          2: '#e7b3ff',
        },
        neon: {
          violet: '#c552ff',
        },
        ink: {
          950: '#110019',
          900: '#180022',
          800: '#250031',
          700: '#3a2442',
          600: '#5b4963',
          500: '#75647c',
          300: '#baafc0',
          200: '#d9d1dd',
          100: '#eee9f1',
          50: '#faf7fb',
        },
        bg: 'var(--dp-bg)',
        surface: 'var(--dp-surface)',
        'surface-elevated': 'var(--dp-surface-elevated)',
        text: 'var(--dp-text)',
        'text-muted': 'var(--dp-text-muted)',
        border: 'var(--dp-border)',
        primary: {
          DEFAULT: 'var(--dp-primary)',
          hover: 'var(--dp-primary-hover)',
        },
        accent: 'var(--dp-accent)',
        focus: 'var(--dp-focus)',
      },
      backgroundImage: {
        'gradient-action': 'var(--dp-gradient-action)',
        'gradient-brand': 'var(--dp-gradient-brand)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        dp: '0 4px 14px rgba(68, 0, 102, 0.10)',
        'dp-md': '0 12px 32px rgba(68, 0, 102, 0.16)',
        'dp-glow': '0 0 36px rgba(190, 61, 255, 0.30)',
      },
      transitionTimingFunction: {
        brand: 'cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
