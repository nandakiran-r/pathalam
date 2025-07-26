import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Extend recommended configs
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Add overrides to disable rules here
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Disable the rule globally
    },
  },
];

export default eslintConfig;
