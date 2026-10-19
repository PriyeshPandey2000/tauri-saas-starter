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
        { type: "adapter", pattern: "**/src/ports/adapters/**", mode: "full" },
        { type: "port", pattern: "**/src/ports/**", mode: "full" },
        { type: "app", pattern: "**/src/app/**", mode: "full" },
        { type: "routes", pattern: "**/src/routes/**", mode: "full" },
        { type: "feature", pattern: "**/src/features/**", mode: "full" },
        { type: "shared", pattern: "**/src/shared/**", mode: "full" },
        { type: "entry", pattern: "**/src/*.{ts,tsx}", mode: "full" },
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
            { from: "entry", allow: ["app", "routes", "feature", "shared", "port", "adapter"] },
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
          rules: [{ target: ["feature"], allow: ["index.ts", "**/index.ts"] }],
        },
      ],
      "boundaries/no-unknown": ["error"],
    },
  },
];
