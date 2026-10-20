import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

function webviewConsoleBridge() {
  return {
    name: "webview-console-bridge",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/__webview-log", (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
          body += String(chunk);
        });
        req.on("end", () => {
          try {
            const { level, message } = JSON.parse(body) as {
              level: string;
              message: string;
            };
            console.log(`[webview:${level}] ${message}`);
          } catch {
            console.log("[webview:error] malformed log payload");
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const sharedDir = fileURLToPath(
  new URL("../../packages/shared/src", import.meta.url),
);

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    webviewConsoleBridge(),
  ],
  resolve: {
    alias: {
      "@": srcDir,
      "@app/shared": sharedDir,
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
