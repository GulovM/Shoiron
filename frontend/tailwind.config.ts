import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        sand: 'rgb(var(--color-sand) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        link: 'rgb(var(--color-link) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [typography],
};

export default config;
