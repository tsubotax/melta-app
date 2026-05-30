/**
 * melta-app ESLint flat config（設計書 §5 design lint 骨格）。
 *
 * 対象は src/ の実装のみ。catalog/scripts は意図的に緩く（catalog は publish 除外、§6）、
 * 生成物（native-theme.ts / contract-types.ts）は raw 値を含むため除外。
 * 本丸は A-3 conformance、これは補助線（§5）。
 */

import tseslint from "typescript-eslint";
import { meltaPlugin } from "./eslint-rules/melta.mjs";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "src/theme/native-theme.ts",
      "src/contracts/contract-types.ts",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parser: tseslint.parser },
    plugins: { melta: meltaPlugin },
    rules: {
      "melta/no-raw-color": "error",
      "melta/no-raw-radius": "error",
      "melta/no-raw-spacing": "warn",
      "melta/no-raw-fontsize": "warn",
    },
  },
);
