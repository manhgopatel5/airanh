import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme"; // ✅ FIX: ESM import thay vì require()
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",

  // Chỉ scan file có JSX
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./ui/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  // Safelist cho class dynamic
  safelist: [
    {
      pattern: /^(bg|text|border)-(slate|gray|zinc|neutral|stone|red|green|blue|yellow|purple)-(50|100|200|300|400|500|600|700|800|900)$/,
      variants: ["hover", "dark", "dark:hover", "group-hover"],
    },
    {
      pattern: /^(w|h)-(0|px|0.5|1|1.5|2|2.5|3|3.5|4|5|6|7|8|9|10|11|12|14|16|20|24|28|32|36|40|44|48|52|56|60|64|72|80|96)$/,
    },
    {
      pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/,
      variants: ["sm", "md", "lg", "xl", "2xl"],
    },
    "animate-shimmer",
        borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },

      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "dark-sm": "0 1px 2px 0 rgb(0 0 0 / 0.3)",
        "dark-md": "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
      },

      willChange: {
        transform: "transform",
        opacity: "opacity",
        scroll: "scroll-position",
      },
    },
  },

  plugins: [forms, typography, containerQueries, animate],

  corePlugins: {
    aspectRatio: false,
    touchAction: false,
    scrollSnapType: false,
  },

  future: {
    hoverOnlyWhenSupported: true,
  },
};

export default config;