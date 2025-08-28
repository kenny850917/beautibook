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
      // BeautiBook brand colors
      colors: {
        primary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7", // Main brand purple
          600: "#9333ea",
          700: "#7c2d12",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764",
        },
        secondary: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899", // Complementary pink
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
          950: "#500724",
        },
        accent: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e", // Success green
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
      },

      // Custom spacing scale (4, 8, 12, 16px multiples)
      spacing: {
        "18": "4.5rem", // 72px
        "22": "5.5rem", // 88px
        "26": "6.5rem", // 104px
        "30": "7.5rem", // 120px
        "34": "8.5rem", // 136px
        "38": "9.5rem", // 152px
        "42": "10.5rem", // 168px
        "46": "11.5rem", // 184px
        "50": "12.5rem", // 200px
      },

      // Touch target utilities (minimum 44px)
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },

      // Mobile-first breakpoints
      screens: {
        xs: "475px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },

      // Custom font sizes for mobile readability
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },

      // Custom shadows for depth
      boxShadow: {
        soft: "0 2px 4px 0 rgba(0, 0, 0, 0.05)",
        medium: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        strong: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
        glow: "0 0 20px rgba(168, 85, 247, 0.15)",
      },

      // Animation for smooth interactions
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },

      // Border radius for consistent design
      borderRadius: {
        sm: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [
    // Add custom utilities
    function ({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        // Touch-friendly button base
        ".btn-touch": {
          minHeight: "44px",
          minWidth: "44px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "0.5rem",
          fontWeight: "500",
          transition: "all 0.2s ease-in-out",
        },

        // Safe area for mobile devices
        ".safe-top": {
          paddingTop: "env(safe-area-inset-top)",
        },
        ".safe-bottom": {
          paddingBottom: "env(safe-area-inset-bottom)",
        },
        ".safe-left": {
          paddingLeft: "env(safe-area-inset-left)",
        },
        ".safe-right": {
          paddingRight: "env(safe-area-inset-right)",
        },

        // Card styles for consistent UI
        ".card": {
          backgroundColor: "white",
          borderRadius: "0.75rem",
          boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.05)",
          padding: "1.5rem",
        },

        // Input styles for forms
        ".input-field": {
          width: "100%",
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          border: "1px solid #d4d4d4",
          fontSize: "1rem",
          lineHeight: "1.5rem",
          transition: "all 0.2s ease-in-out",
          minHeight: "44px",
        },
        ".input-field:focus": {
          outline: "none",
          borderColor: "#a855f7",
          boxShadow: "0 0 0 3px rgba(168, 85, 247, 0.1)",
        },
      };

      addUtilities(newUtilities);
    },
  ],
};

export default config;

