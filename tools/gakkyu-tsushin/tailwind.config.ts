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
        bg: '#f7f5f0',
        card: '#ffffff',
        ink: '#1c1c2e',
        muted: '#999999',
        border: '#e8e4de',
        accent: '#C0634C',
        'red-bg': '#fcebeb',
        'red-text': '#a32d2d',
        'red-border': '#f7c1c1',
        'amber-bg': '#faeeda',
        'amber-text': '#854f0b',
        'amber-border': '#fac775',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'M PLUS 1p', 'Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
