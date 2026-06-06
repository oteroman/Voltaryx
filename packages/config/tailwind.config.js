/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: {
        // Bases
        void:      '#080A0D',
        surface: {
          1: '#0F1217',
          2: '#161B22',
          3: '#1E2530',
        },
        border: {
          DEFAULT: '#2A3140',
          subtle:  '#1C2230',
        },
        // Volt (acento primario)
        volt: {
          100: 'rgba(200,255,0,0.10)',
          200: 'rgba(200,255,0,0.20)',
          400: '#D4FF33',
          500: '#C8FF00',
          600: '#A0CC00',
        },
        // Texto
        text: {
          primary:   '#F0F4F8',
          secondary: '#8B97A8',
          tertiary:  '#5A6672',
          disabled:  '#374151',
          inverse:   '#080A0D',
        },
        // Estados semánticos
        critical: {
          DEFAULT: '#FF4444',
          bg:      'rgba(255,68,68,0.10)',
        },
        warning: {
          DEFAULT: '#FF9500',
          bg:      'rgba(255,149,0,0.10)',
        },
        success: {
          DEFAULT: '#00D97E',
          bg:      'rgba(0,217,126,0.10)',
        },
        info: {
          DEFAULT: '#4A9EBF',
          bg:      'rgba(74,158,191,0.10)',
        },
      },
      fontFamily: {
        display:   ['Space Grotesk', 'sans-serif'],
        sans:      ['DM Sans', 'sans-serif'],
        mono:      ['JetBrains Mono', 'monospace'],
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
        '4xl':  ['48px', { lineHeight: '56px' }],
      },
      spacing: {
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '8':  '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        'sm':  '6px',
        'DEFAULT': '8px',
        'md':  '10px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '20px',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
      animation: {
        'pulse-volt': 'pulse-volt 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-volt': {
          '0%, 100%': { opacity: 1 },
          '50%':      { opacity: 0.4 },
        },
      },
    },
  },
  plugins: [],
}
