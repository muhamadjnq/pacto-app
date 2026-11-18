/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        mute: 'rgb(var(--mute) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / var(--line-a))',
        brand: { DEFAULT: '#6366f1', 2: '#8b5cf6', soft: 'rgb(99 102 241 / 0.12)' },
        ok: '#10b981', warn: '#f59e0b', bad: '#ef4444', info: '#0ea5e9',
      },
      fontFamily: { sans: ['Vazirmatn', 'system-ui', 'sans-serif'] },
      borderRadius: { xl2: '20px', xl3: '26px' },
      boxShadow: { card: 'var(--shadow)', pop: 'var(--shadow-2)' },
      keyframes: {
        in: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { to: { backgroundPosition: '-200% 0' } },
        pop: { '50%': { transform: 'scale(1.18)' } },
        ping2: { to: { transform: 'scale(2.2)', opacity: '0' } },
      },
      animation: {
        in: 'in .34s cubic-bezier(.2,.8,.2,1) both',
        sheet: 'sheet .32s cubic-bezier(.2,.8,.2,1) both',
        fade: 'fade .2s ease both',
        shimmer: 'shimmer 1.4s linear infinite',
        pop: 'pop .3s ease',
        ping2: 'ping2 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
