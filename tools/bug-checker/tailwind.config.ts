import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f5f3',
        ink: '#1a1a18',
        muted: '#888780',
        faint: '#b4b2a9',
        border: '#e0dfd8',
        'border-dark': '#c8c7c0',
        surface: '#fafaf8',
        'red-bg': '#fcebeb',
        'red-text': '#a32d2d',
        'red-border': '#f7c1c1',
        'green-bg': '#eaf3de',
        'green-text': '#3b6d11',
        'green-border': '#c0dd97',
        'amber-bg': '#faeeda',
        'amber-text': '#854f0b',
        'amber-border': '#fac775',
        'step-done': '#639922',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Noto Sans JP', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'verdict-pop': 'verdictPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'slide-down': 'slideDown 0.4s ease forwards',
        'spin-ring': 'spinRing 0.7s linear infinite',
      },
      keyframes: {
        verdictPop: {
          '0%':   { opacity: '0', transform: 'scale(0.92) translateY(8px)' },
          '60%':  { opacity: '1', transform: 'scale(1.03) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spinRing: {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
