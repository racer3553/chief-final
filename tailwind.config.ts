import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        chief: {
          black: '#0a0a0a',
          yellow: '#f5c518',
          green: '#39ff14',
          cyan: '#00e5ff',
          red: '#ff2d2d',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
