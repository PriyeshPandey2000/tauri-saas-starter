import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const sharedDir = fileURLToPath(
  new URL("../../packages/shared/src", import.meta.url),
);

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": srcDir,
      "@app/shared": sharedDir,
    },
  },
});
