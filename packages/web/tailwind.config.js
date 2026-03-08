/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      animation: {
        "fade-in": "fadeIn 0.5s ease-in",
        "shimmer": "shimmer 2s infinite linear",
        "ellipsis": "ellipsis 1.4s infinite steps(4, end)",
        "pulse-border": "pulseBorder 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        ellipsis: {
          "0%": { content: "''" },
          "25%": { content: "'.'" },
          "50%": { content: "'..'" },
          "75%": { content: "'...'" },
        },
        pulseBorder: {
          "0%, 100%": { borderColor: "rgb(191 219 254)" },
          "50%": { borderColor: "rgb(96 165 250)" },
        },
      },
    },
  },
  plugins: [],
};
