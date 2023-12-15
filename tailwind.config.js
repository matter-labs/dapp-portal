/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
const plugin = require("tailwindcss/plugin");

module.exports = {
  darkMode: "class",
  content: [
    "./components/**/*.{js,vue,ts}",
    "./views/**/*.vue",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./utils/**/*.{js,ts}",
    "./nuxt.config.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [`'Inter'`, ...defaultTheme.fontFamily.sans],
      },
      colors: {
        gray: {
          DEFAULT: "#f7f7f7",
          secondary: "#75808a",
          input: "#edeff2",
          "input-focus": "#dfe3e7",
        },
        warning: {
          400: "#FFC81A",
          600: "#E5AF00",
        },
        success: {
          400: "#33FF99",
          600: "#00CC66",
        },
      },
      spacing: {
        "block-padding": "32px",
        "block-padding-1/2": "16px",
        "block-padding-1/4": "8px",
        "block-gap": "24px",
        "block-gap-2/3": "16px",
        "block-gap-1/2": "12px",
      },
    },
    screens: {
      xxs: "320px",
      xs: "480px",
      sm: "640px",
      md: "720px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1920px",
    },
  },
  plugins: [
    plugin(function ({ addBase, addUtilities, theme }) {
      addBase({
        ".h1": {
          fontSize: "36px",
          fontWeight: "400",
          lineHeight: "1.15",
          marginBottom: theme("spacing.block-gap-2/3"),
        },
        "@screen sm": {
          ".h1": {
            fontSize: "40px",
            lineHeight: "1.4",
            marginBottom: theme("spacing.block-gap"),
          },
        },
        ".h2": {
          fontSize: "26px",
          fontWeight: theme("fontWeight.bold"),
          lineHeight: theme("lineHeight.tight"),
          paddingTop: theme("padding.5"),
        },
      });
      addUtilities({
        ".wrap-balance": {
          textWrap: "balance",
        },
      });
    }),
    require("tailwindcss-themer")({
      defaultTheme: {
        extend: {
          colors: {
            primary: {
              50: "#D9E3FF",
              100: "#D9E3FF",
              200: "#4075FF",
              300: "#1755F4",
              400: "#1650E5",
              500: "#2663FF",
              600: "#1347CC",
              700: "#113EB2",
              800: "#0C2C80",
              900: "#071B4D",
            },
            error: {
              300: "#FF6666",
              600: "#CC0000",
            },
            neutral: {
              50: "#F7F9FC",
              100: "#E8ECF2",
              200: "#DADDE5",
              300: "#BEC2CC",
              400: "#A1A7B3",
              500: "#858C99",
              600: "#6C7380",
              700: "#555A66",
              800: "#3D424D",
              900: "#262B33",
              950: "#11141A",
            },
          },
        },
      },
      themes: [
        {
          name: "lite",
          extend: {
            colors: {
              primary: {
                50: "#F3F5FF",
                100: "#D9D9F9",
                200: "#CBCBFF",
                300: "#8C8DFC",
                400: "#5D65B9",
                500: "#53579f",
                600: "#4E529A",
                700: "#32325D",
                800: "#27274E",
                900: "#11142B",
              },
            },
          },
        },
      ],
    }),
  ],
};
