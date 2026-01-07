import nextConfig from "eslint-config-next";
import globals from "globals";

const ignoredPatterns = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/dist/**",
  "**/out/**",
  "**/coverage/**",
];

const config = [
  {
    ignores: ignoredPatterns,
  },
  ...nextConfig,
  {
    files: ["scripts/**/*.{js,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];

export default config;

