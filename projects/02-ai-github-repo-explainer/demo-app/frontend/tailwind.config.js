/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark commerce theme
        surface: {
          DEFAULT: '#0f0f0f',
          card: '#1a1a1a',
          elevated: '#242424',
          border: '#2e2e2e',
        },
        brand: {
          DEFAULT: '#6366f1',   // indigo-500
          hover: '#4f46e5',     // indigo-600
          light: '#818cf8',     // indigo-400
          muted: '#312e81',     // indigo-900
        },
        accent: {
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#eab308',
          orange: '#f97316',
          blue: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #1e1b4b 0%, #0f0f0f 50%, #1c1917 100%)',
        'card-gradient': 'linear-gradient(145deg, #1a1a1a 0%, #242424 100%)',
      },
    },
  },
  plugins: [],
}
