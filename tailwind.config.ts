import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      /* --------------------------------------------------------
         Colors
         -------------------------------------------------------- */
      colors: {
        // Original brand palette (kept for backward compat)
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36adf6',
          500: '#0c93e7',
          600: '#0074c5',
          700: '#015ca0',
          800: '#064f84',
          900: '#0b426e',
          950: '#072a49',
        },
        // CSS variable-based theme colors
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          active: 'var(--accent-active)',
          light: 'var(--accent-light)',
          subtle: 'var(--accent-subtle)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          secondary: 'var(--surface-secondary)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
          raised: 'var(--surface-raised)',
        },
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          canvas: 'var(--bg-canvas)',
          elevated: 'var(--bg-elevated)',
          inset: 'var(--bg-inset)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          quaternary: 'var(--text-quaternary)',
          'on-accent': 'var(--text-on-accent)',
          link: 'var(--text-link)',
        },
        border: {
          primary: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
          tertiary: 'var(--border-tertiary)',
          focus: 'var(--border-focus)',
          divider: 'var(--border-divider)',
        },
        // Semantic colors
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
        },
        error: {
          DEFAULT: 'var(--error)',
          bg: 'var(--error-bg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          bg: 'var(--info-bg)',
        },
      },

      /* --------------------------------------------------------
         Typography
         -------------------------------------------------------- */
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Helvetica Neue',
          'sans-serif',
        ],
        display: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Fira Code',
          'Fira Mono',
          'Roboto Mono',
          'Menlo',
          'Courier',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],       // 11px
        xs: ['0.75rem', { lineHeight: '1rem' }],             // 12px
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],        // 13px
        base: ['0.9375rem', { lineHeight: '1.5rem' }],       // 15px
        lg: ['1.0625rem', { lineHeight: '1.75rem' }],        // 17px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],          // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],           // 24px
        '3xl': ['2rem', { lineHeight: '2.5rem' }],           // 32px
        '4xl': ['2.5rem', { lineHeight: '3rem' }],           // 40px
        '5xl': ['3rem', { lineHeight: '3.5rem' }],           // 48px
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.022em',
        snug: '-0.01em',
        normal: '0',
        wide: '0.012em',
        wider: '0.04em',
        widest: '0.1em',
      },

      /* --------------------------------------------------------
         Border Radius (Apple-style)
         -------------------------------------------------------- */
      borderRadius: {
        xs: 'var(--radius-xs)',     // 4px
        sm: 'var(--radius-sm)',     // 6px
        md: 'var(--radius-md)',     // 10px
        lg: 'var(--radius-lg)',     // 14px
        xl: 'var(--radius-xl)',     // 20px
        '2xl': 'var(--radius-2xl)', // 28px
        full: 'var(--radius-full)', // 9999px
      },

      /* --------------------------------------------------------
         Box Shadows (Apple-style layered)
         -------------------------------------------------------- */
      boxShadow: {
        'theme-xs': 'var(--shadow-xs)',
        'theme-sm': 'var(--shadow-sm)',
        'theme-md': 'var(--shadow-md)',
        'theme-lg': 'var(--shadow-lg)',
        'theme-xl': 'var(--shadow-xl)',
        'theme-float': 'var(--shadow-float)',
        'theme-ring': 'var(--shadow-ring)',
      },

      /* --------------------------------------------------------
         Backdrop Blur
         -------------------------------------------------------- */
      backdropBlur: {
        xs: '4px',
        sm: 'var(--blur-sm)',   // 8px
        md: 'var(--blur-md)',   // 16px
        lg: 'var(--blur-lg)',   // 24px
        xl: 'var(--blur-xl)',   // 40px
        glass: 'var(--glass-blur)',
      },

      /* --------------------------------------------------------
         Spacing (sidebar dimensions)
         -------------------------------------------------------- */
      spacing: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed-width)',
        'page-x': 'var(--space-page-x)',
        'page-y': 'var(--space-page-y)',
        'section': 'var(--space-section)',
      },

      /* --------------------------------------------------------
         Animations
         -------------------------------------------------------- */
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'scale-out': {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.95)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'fade-out': 'fade-out 0.2s ease-in forwards',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-down': 'slide-down 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-in-left': 'slide-in-left 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        'scale-out': 'scale-out 0.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },

      /* --------------------------------------------------------
         Transition timing functions
         -------------------------------------------------------- */
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bounce-sm': 'cubic-bezier(0.18, 0.89, 0.32, 1.28)',
      },
      transitionDuration: {
        'fast': '120ms',
        'base': '200ms',
        'slow': '350ms',
      },
    },
  },
  plugins: [],
}
export default config
