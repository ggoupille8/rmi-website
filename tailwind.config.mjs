/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    // Container widths - industrial, structured approach
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1400px", // Max content width for readability
      },
    },
    extend: {
      // Spacing scale - consistent 8px base unit
      spacing: {
        18: "4.5rem", // 72px
        22: "5.5rem", // 88px
        26: "6.5rem", // 104px
        30: "7.5rem", // 120px
        34: "8.5rem", // 136px
        38: "9.5rem", // 152px
        42: "10.5rem", // 168px
        46: "11.5rem", // 184px
        50: "12.5rem", // 200px
      },
      // Type scale - industrial, strong hierarchy
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1.6", letterSpacing: "0.025em" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.7", letterSpacing: "0.025em" }], // 14px
        base: ["1rem", { lineHeight: "1.75", letterSpacing: "0.01em" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75", letterSpacing: "0.01em" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.7", letterSpacing: "0em" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "1.5", letterSpacing: "-0.01em" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "1.4", letterSpacing: "-0.02em" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "1.3", letterSpacing: "-0.02em" }], // 36px
        "5xl": ["3rem", { lineHeight: "1.2", letterSpacing: "-0.03em" }], // 48px
        "6xl": ["3.75rem", { lineHeight: "1.15", letterSpacing: "-0.03em" }], // 60px
        "7xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.04em" }], // 72px
        "8xl": ["6rem", { lineHeight: "1.1", letterSpacing: "-0.04em" }], // 96px
        "9xl": ["8rem", { lineHeight: "1.05", letterSpacing: "-0.05em" }], // 128px
      },
      // Font weights - industrial strength
      fontWeight: {
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
      },
      // Colors using CSS variables for industrial theme
      colors: {
        // Primary - Deep steel blue (industrial, trustworthy)
        primary: {
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-primary-600) / <alpha-value>)",
        },
        // Accent - Safety orange (industrial, attention-grabbing)
        accent: {
          50: "rgb(var(--color-accent-50) / <alpha-value>)",
          100: "rgb(var(--color-accent-100) / <alpha-value>)",
          200: "rgb(var(--color-accent-200) / <alpha-value>)",
          300: "rgb(var(--color-accent-300) / <alpha-value>)",
          400: "rgb(var(--color-accent-400) / <alpha-value>)",
          500: "rgb(var(--color-accent-500) / <alpha-value>)",
          600: "rgb(var(--color-accent-600) / <alpha-value>)",
          700: "rgb(var(--color-accent-700) / <alpha-value>)",
          800: "rgb(var(--color-accent-800) / <alpha-value>)",
          900: "rgb(var(--color-accent-900) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-accent-500) / <alpha-value>)",
        },
        // Neutral - Charcoal and steel grays
        neutral: {
          50: "rgb(var(--color-neutral-50) / <alpha-value>)",
          100: "rgb(var(--color-neutral-100) / <alpha-value>)",
          200: "rgb(var(--color-neutral-200) / <alpha-value>)",
          300: "rgb(var(--color-neutral-300) / <alpha-value>)",
          400: "rgb(var(--color-neutral-400) / <alpha-value>)",
          500: "rgb(var(--color-neutral-500) / <alpha-value>)",
          600: "rgb(var(--color-neutral-600) / <alpha-value>)",
          700: "rgb(var(--color-neutral-700) / <alpha-value>)",
          800: "rgb(var(--color-neutral-800) / <alpha-value>)",
          900: "rgb(var(--color-neutral-900) / <alpha-value>)",
          DEFAULT: "rgb(var(--color-neutral-600) / <alpha-value>)",
        },
        // Semantic colors with strong contrast
        success: {
          DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
          light: "rgb(var(--color-success-light) / <alpha-value>)",
          dark: "rgb(var(--color-success-dark) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          light: "rgb(var(--color-error-light) / <alpha-value>)",
          dark: "rgb(var(--color-error-dark) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
          light: "rgb(var(--color-warning-light) / <alpha-value>)",
          dark: "rgb(var(--color-warning-dark) / <alpha-value>)",
        },
      },
      // Border radius - using CSS variables for industrial premium feel
      borderRadius: {
        none: "var(--radius-none)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-base)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        full: "var(--radius-full)",
      },
      // Box shadows - using CSS variables for industrial depth
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-base)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        none: "var(--shadow-none)",
      },
    },
  },
  plugins: [],
};
