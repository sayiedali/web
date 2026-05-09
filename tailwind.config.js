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
        "p-red": "#AE1217",
        "p-blue": "#005B89",
        "p-yellow": "#FCB900",
        "p-border": "#8989896a",
        "p-brown":"#61443E",
        "d-yellow":"#CE9700",
        "footer-white":"#eeeeee",
        // POS premium brand system
        "brand-cream": "#FDF6EE",
        "brand-petal": "#FAF1E6",
        "brand-sand": "#EAE0D5",
        "brand-espresso": "#2D1B0E",
        "brand-warm": "#9B8B7A",
        "brand-basil": "#3D7A4F",
        "brand-gold": "#CE9700",
      },
    },
  },
  plugins: [],
}
