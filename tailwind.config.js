/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        border: 'var(--border)',
        primary: 'var(--text-primary)',
        muted: 'var(--text-muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          breach: 'var(--accent-breach)',
        },
        status: {
          normal: 'var(--status-normal)',
          warning: 'var(--status-warning)',
          critical: 'var(--status-critical)',
          root: 'var(--status-root)',
          recovering: 'var(--status-recovering)',
          recovered: 'var(--status-recovered)',
        },
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
