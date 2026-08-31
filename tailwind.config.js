/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f7f3ea',
        'bg-card': '#fffdf8',
        'bg-glass': 'rgba(255,253,248,0.78)',
        border: 'rgba(58,49,40,0.10)',
        'border-glow': 'rgba(184,134,59,0.35)',
        text: '#3a3128',
        'text-muted': '#8f8272',
        'text-heading': '#241f18',
        accent: '#a9772f',
        'accent-2': '#8c3f3f',
        'accent-gold': '#b8842a',
        'accent-green': '#6f9668',
        glow: 'rgba(184,134,59,0.15)',
      },
      borderRadius: {
        'custom': '14px',
        'custom-sm': '8px',
      },
      fontFamily: {
        sans: ["'Outfit'", 'system-ui', 'sans-serif'],
        arabic: ["'Amiri'", 'serif'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(58,49,40,0.08)',
      },
      backdropBlur: {
        'custom': '16px',
        'lg': '20px',
      },
      animation: {
        'spin': 'spin 0.7s linear infinite',
      },
      transitionProperty: {
        'all': 'all',
      },
      maxWidth: {
        '7xl': '1200px',
        '3xl': '780px',
      },
      height: {
        '17': '68px',
      },
      width: {
        '5.5': '22px',
      },
      spacing: {
        '0.5': '2px',
        '1.5': '6px',
        '2.5': '10px',
        '3.5': '14px',
        '4.5': '18px',
      },
      lineHeight: {
        'relaxed': '2.4',
      },
      opacity: {
        '85': '0.85',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.dir-rtl': {
          direction: 'rtl',
        },
        '.bg-glass': {
          background: 'rgba(255,253,248,0.78)',
          border: '1px solid rgba(58,49,40,0.10)',
          'border-radius': '14px',
          'backdrop-filter': 'blur(16px)',
        },
        '.scrollbar-custom': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgba(184,134,59,0.35) #f7f3ea',
        },
        '.scrollbar-custom::-webkit-scrollbar': {
          width: '6px',
        },
        '.scrollbar-custom::-webkit-scrollbar-track': {
          background: '#f7f3ea',
        },
        '.scrollbar-custom::-webkit-scrollbar-thumb': {
          background: 'rgba(184,134,59,0.35)',
          'border-radius': '3px',
        },
      })
    }
  ],
}