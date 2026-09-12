import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["preview/image.tsx", "preview/link.tsx"],
    rules: { "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }] },
  },
  globalIgnores([
    ".next/**",
    "pages-dist/**",
    ".voyra-local/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
