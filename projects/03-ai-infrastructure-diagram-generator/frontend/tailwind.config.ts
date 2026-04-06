import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0f0f1a",
        surface: "#1a1a2e",
        card: "#1e1e3a",
        border: "#2a2a45",
        accent: "#6c63ff",
        "accent-dim": "#4a44b5",
        muted: "#8888aa",
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
        aws: "#FF9900",
        azure: "#0078D4",
        gcp: "#4285F4",
        k8s: "#326CE5",
      },
    },
  },
  plugins: [],
};
export default config;
