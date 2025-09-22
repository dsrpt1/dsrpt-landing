/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dsrpt: {
          bg: "#09090b",
          card: "#0f0f13",
          text: "#e5e7eb",
          mute: "#9ca3af",
          brand: "#7c5cff",
          brand2: "#16b8a6",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.2)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
