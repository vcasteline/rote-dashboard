import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Ignorar variables no usadas
      "@typescript-eslint/no-unused-vars": "off",
      
      // Permitir uso de any
      "@typescript-eslint/no-explicit-any": "off",
      
      // Permitir uso de img en lugar de Image
      "@next/next/no-img-element": "off",
      
      // Permitir prefer-const warnings
      "prefer-const": "off",
      
      // Ignorar otros warnings comunes
      "no-unused-vars": "off",
    }
  }
];

export default eslintConfig;
