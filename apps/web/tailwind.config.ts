import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wierd: {
          dark: '#080c14',
          surface: '#0f1724',
          card: '#162235',
          cardHover: '#1c2b42',
          border: '#24344d',
          flame: '#ff4d2e',
          amber: '#f59e0b',
          lime: '#10b981',
          masala: '#e11d48',
          neon: '#a855f7',
          muted: '#94a3b8',
          subtext: '#cbd5e1',
          cream: '#f8fafc',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        flame: '0 0 25px -5px rgba(255, 77, 46, 0.4)',
        amber: '0 0 25px -5px rgba(245, 158, 11, 0.4)',
        neon: '0 0 25px -5px rgba(168, 85, 247, 0.35)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'flame-gradient': 'linear-gradient(135deg, #ff4d2e 0%, #f59e0b 100%)',
        'hostel-night': 'linear-gradient(180deg, #080c14 0%, #0f1724 100%)',
        'card-glow': 'radial-gradient(circle at top, rgba(255, 77, 46, 0.08) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};

export default config;
