/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f5f5f0',
          100: '#e8e8e0',
          200: '#d0d0c4',
          300: '#b0b0a0',
          400: '#808070',
          500: '#606050',
          600: '#484838',
          700: '#303025',
          800: '#202018',
          900: '#141410',
          950: '#0a0a08',
        },
        accent: {
          DEFAULT: '#c8a96e',
          light:   '#e0c99e',
          dark:    '#9a7a3e',
        },
        success: '#4a9e6c',
        warning: '#c8862e',
        danger:  '#b84040',
        info:    '#4070b8',
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
    },
  },
  plugins: [],
}
