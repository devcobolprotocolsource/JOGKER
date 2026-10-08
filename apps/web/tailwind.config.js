/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: 'var(--color-brand)',
        'brand-hover': 'var(--color-brand-hover)',
        'brand-contrast': 'var(--color-brand-contrast)',
        accent: 'var(--color-accent)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
      },
      fontFamily: {
        sans: ['var(--font-family)', 'system-ui', 'sans-serif'],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      borderRadius: {
        control: '0.625rem',
        card: '0.875rem',
        modal: '1.125rem',
        badge: '9999px',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '1.25', fontWeight: '700' }],
        'panel-title': ['1.125rem', { lineHeight: '1.3', fontWeight: '600' }],
        'btn-label': ['1rem', { lineHeight: '1.2', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        meta: ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'total-lg': ['2rem', { lineHeight: '1.1', fontWeight: '700' }],
      },
    },
  },
  plugins: [],
};
