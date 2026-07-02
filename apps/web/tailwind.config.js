import animate from 'tailwindcss-animate';
const config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: 'clamp(0.75rem, 3vw, 1.5rem)',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        'rs-cream': 'hsl(var(--rs-cream))',
        'rs-cream-warm': 'hsl(var(--rs-cream-warm))',
        'rs-ink': 'hsl(var(--rs-ink))',
        'rs-ink-soft': 'hsl(var(--rs-ink-soft))',
        'rs-gold': 'hsl(var(--rs-gold))',
        'rs-gold-light': 'hsl(var(--rs-gold-light))',
        'rs-gold-bg': 'hsl(var(--rs-gold-bg))',
        'rs-peach': 'hsl(var(--rs-peach))',
        'rs-peach-light': 'hsl(var(--rs-peach-light))',
        'rs-rose': 'hsl(var(--rs-rose))',
        'rs-rose-dark': 'hsl(var(--rs-rose-dark))',
        'rs-rose-bg': 'hsl(var(--rs-rose-bg))',
        'rs-green': 'hsl(var(--rs-green))',
        'rs-green-bg': 'hsl(var(--rs-green-bg))',
        'rs-orange': 'hsl(var(--rs-orange))',
        'rs-orange-bg': 'hsl(var(--rs-orange-bg))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
};
export default config;
