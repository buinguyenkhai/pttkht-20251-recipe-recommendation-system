/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#f59e0b",
      },
      fontFamily: {
        times: ["Times New Roman", "serif"]
      },
    },
  },
  plugins: [],
};
