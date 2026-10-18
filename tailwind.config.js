/** Colours and fonts point at CSS variables, so the theme can change at runtime. */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg-primary)',
        bg2: 'var(--bg-secondary)',
        bg3: 'var(--bg-tertiary)',
        ink: 'var(--text-primary)',
        ink2: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-light': 'var(--accent-light)',
        'accent-contrast': 'var(--accent-contrast)',
        line: 'var(--border)',
        card: 'var(--card-bg)',
        highlight: 'var(--highlight)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
      borderRadius: {
        card: 'var(--radius)',
      },
      maxWidth: {
        site: 'var(--container)',
      },
    },
  },
  plugins: [],
};
