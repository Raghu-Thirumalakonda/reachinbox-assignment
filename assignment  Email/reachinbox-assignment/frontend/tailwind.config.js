/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#00A63E",
        ink: "#010715"
      }
    }
  },
  plugins: []
};
