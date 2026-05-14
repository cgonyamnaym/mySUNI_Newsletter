import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Wanted Design System — Atomic
        wds: {
          blue: {
            50:  '#EAF2FE',
            300: '#3385FF',
            500: '#0066FF',
            600: '#005EEB',
          },
          violet: {
            50:  '#F0ECFE',
            500: '#9747FF',
            600: '#6541F2',
          },
          red:   { 500: '#FF4242' },
          green: { 500: '#00BF40' },
          teal:  { 500: '#0098B2' },
          gray: {
            50:  '#F7F7F8',
            100: '#F4F4F5',
            200: '#DBDCDF',
            300: '#C2C4C8',
            400: '#AEB0B6',
            500: '#989BA2',
            600: '#70737C',
            700: '#37383C',
            800: '#2E2F33',
            900: '#1B1C1E',
            950: '#171719',
          },
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        xs:    '4px',
        sm:    '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '24px',
        '2xl':'32px',
        '3xl':'64px',
        full:  '9999px',
      },
      boxShadow: {
        'wds-xs': '0 1px 2px   rgba(23,23,23,0.06)',
        'wds-sm': '0 2px 6px   rgba(23,23,23,0.07)',
        'wds-md': '0 4px 16px  rgba(23,23,23,0.08)',
        'wds-lg': '0 12px 32px rgba(23,23,23,0.10)',
      },
      letterSpacing: {
        tightest: '-0.032em',
        tighter:  '-0.027em',
        tight:    '-0.024em',
        snug:     '-0.010em',
        wide:     '0.006em',
        wider:    '0.015em',
        widest:   '0.025em',
      },
    },
  },
  plugins: [],
}

export default config
