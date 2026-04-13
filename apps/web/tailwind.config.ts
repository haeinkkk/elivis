import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto-sans)", "sans-serif"],
      },
      /**
       * 다크 모드 전용 시맨틱 색상 — `html.dark`에서만 CSS 변수가 정의됩니다.
       * RGB 채널만 저장해 `<alpha-value>`와 함께 불투명도 수정자를 지원합니다.
       */
      colors: {
        elivis: {
          bg: "rgb(var(--elivis-bg) / <alpha-value>)",
          surface: {
            DEFAULT: "rgb(var(--elivis-surface-1) / <alpha-value>)",
            elevated: "rgb(var(--elivis-surface-2) / <alpha-value>)",
          },
          accent: {
            DEFAULT: "rgb(var(--elivis-accent) / <alpha-value>)",
            hover: "rgb(var(--elivis-accent-hover) / <alpha-value>)",
            strong: "rgb(var(--elivis-accent-strong) / <alpha-value>)",
          },
          ink: {
            DEFAULT: "rgb(var(--elivis-text-primary) / <alpha-value>)",
            secondary: "rgb(var(--elivis-text-secondary) / <alpha-value>)",
            muted: "rgb(var(--elivis-text-muted) / <alpha-value>)",
          },
          line: "rgb(var(--elivis-border) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
