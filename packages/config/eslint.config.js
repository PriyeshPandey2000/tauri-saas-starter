import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";

export default [
  js.configs.recommended,
  {
    ignores: ["**/dist/**", "**/build/**", "**/target/**", "**/.turbo/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      boundaries: boundaries,
      import: importPlugin,
    },
    settings: {
      "boundaries/elements": [
        { type: "app", pattern: "apps/desktop/src/app/**" },
        { type: "routes", pattern: "apps/desktop/src/routes/**" },
        { type: "feature", pattern: "apps/desktop/src/features/**" },
        { type: "shared", pattern: "apps/desktop/src/shared/**" },
        { type: "port", pattern: "apps/desktop/src/ports/**" },
        { type: "adapter", pattern: "apps/desktop/src/ports/adapters/**" },
      ],
      "boundaries/ignore": ["**/*.d.ts"],
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "app", allow: ["routes", "shared", "port", "feature"] },
            { from: "routes", allow: ["shared", "port", "feature"] },
            { from: "feature", allow: ["shared", "port"] },
            { from: "shared", allow: ["shared"] },
            { from: "port", allow: ["shared"] },
            { from: "adapter", allow: ["shared", "port"] },
          ],
        },
      ],
      "boundaries/entry-point": [
        "error",
        {
          default: "disallow",
          rules: [
            { target: ["feature", "shared"], allow: ["index.ts", "**/index.ts"] },
          ],
        },
      ],
      "boundaries/no-unknown": ["error"],
    },
  },
];
