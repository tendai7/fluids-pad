import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  safelist: [
    {
      pattern: /^bg-(blue|green|cyan|purple|orange|red|indigo|teal|amber|gray|slate|sky|lime|rose)-(50|100|400|500|900|950)$/,
      variants: ["dark"],
    },
    {
      pattern: /^border-(blue|green|cyan|purple|orange|red|indigo|teal|amber|gray|slate|sky|lime|rose)-(200|300|600|700|800)$/,
      variants: ["dark"],
    },
    {
      pattern: /^text-(blue|green|cyan|purple|orange|red|indigo|teal|amber|gray|slate|sky|lime|rose)-(300|400|500|600|700)$/,
      variants: ["dark"],
    },
  ],
  darkMode: "class",
  plugins: [],
};
export default config;

