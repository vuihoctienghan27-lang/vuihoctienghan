/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F5F4EF",
        ink: "#1E2A32",
        "ink-soft": "#425058",
        brush: "#2F5D62",
        "brush-dark": "#1E4245",
        ochre: "#A9752B",
        error: "#B3261E",
        success: "#3A7D44",
        grid: "#D9D4C6",
      },
      fontFamily: {
        serif: ["'Noto Serif KR'", "serif"],
        sans: ["'Pretendard'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
