import type { Config } from 'tailwindcss'

// All colors use CSS-variable channels so opacity modifiers (bg-volt-500/20) work across themes
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void:    v('void'),
        surface: { 1: v('s1'), 2: v('s2'), 3: v('s3') },
        border:  { DEFAULT: v('border'), subtle: v('border-subtle') },
        volt: {
          100: v('volt-100'),
          200: v('volt-200'),
          400: v('volt-400'),
          500: v('volt-500'),
          600: v('volt-600'),
        },
        ink: {
          primary:   v('ink-primary'),
          secondary: v('ink-secondary'),
          tertiary:  v('ink-tertiary'),
          disabled:  v('ink-disabled'),
          inverse:   v('ink-inverse'),
        },
        critical: { DEFAULT: v('critical'), bg: v('critical-bg') },
        warning:  { DEFAULT: v('warning'),  bg: v('warning-bg')  },
        success:  { DEFAULT: v('success'),  bg: v('success-bg')  },
        info:     { DEFAULT: v('info'),     bg: v('info-bg')     },
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        sans:    ['var(--font-dm-sans)',       'sans-serif'],
        mono:    ['var(--font-jetbrains)',     'monospace'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '16px' }],
        'sm':   ['13px', { lineHeight: '18px' }],
        'base': ['15px', { lineHeight: '22px' }],
        'md':   ['17px', { lineHeight: '24px' }],
        'lg':   ['20px', { lineHeight: '28px' }],
        'xl':   ['24px', { lineHeight: '32px' }],
        '2xl':  ['30px', { lineHeight: '38px' }],
        '3xl':  ['38px', { lineHeight: '46px' }],
      },
      spacing:    { 'touch': '44px' },
      minHeight:  { 'touch': '44px' },
      minWidth:   { 'touch': '44px' },
      borderRadius: {
        'sm': '6px', DEFAULT: '8px', 'md': '10px',
        'lg': '12px', 'xl': '16px',
      },
      keyframes: {
        'pulse-volt': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
      animation: {
        'pulse-volt': 'pulse-volt 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up':   'slide-up 200ms ease-out',
        'fade-in':    'fade-in 150ms ease-out',
      },
    },
  },
  plugins: [],
}

export default config
