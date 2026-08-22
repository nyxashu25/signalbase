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
        // Semantic tokens come from index.css as RGB triplets so Tailwind's
        // opacity modifiers (bg-primary/10, ring-focus/25) work — a bare
        // var(--hex) color can't take one and the class is silently dropped.
        bg: 'rgb(var(--dp-bg-rgb) / <alpha-value>)',
        surface: 'rgb(var(--dp-surface-rgb) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--dp-surface-elevated-rgb) / <alpha-value>)',
        'surface-hover': 'rgb(var(--dp-surface-hover-rgb) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--dp-surface-sunken-rgb) / <alpha-value>)',
        text: 'rgb(var(--dp-text-rgb) / <alpha-value>)',
        'text-muted': 'rgb(var(--dp-text-muted-rgb) / <alpha-value>)',
        border: 'rgb(var(--dp-border-rgb) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--dp-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--dp-primary-hover-rgb) / <alpha-value>)',
        },
        accent: 'rgb(var(--dp-accent-rgb) / <alpha-value>)',
        focus: 'rgb(var(--dp-focus-rgb) / <alpha-value>)',
      },
      backgroundImage: {
        'gradient-action': 'var(--dp-gradient-action)',
        'gradient-brand': 'var(--dp-gradient-brand)',
      },
      // Token-driven (see index.css) so the in-app shell can run tighter
      // corners than the marketing site via a scoped CSS-variable override.
      borderRadius: {
        sm: 'var(--dp-radius-sm)',
        md: 'var(--dp-radius-md)',
        lg: 'var(--dp-radius-lg)',
        xl: 'var(--dp-radius-xl)',
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
