import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { resolveDevProxyTarget } from "./devProxyTarget.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, __dirname, "");
  const proxyTarget = resolveDevProxyTarget({
    processEnv: process.env.DEV_PROXY_TARGET,
    fileEnv: fileEnv.DEV_PROXY_TARGET,
  });

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
        "/sanctum": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },

    test: {
      environment: "node",
      include: ["src/**/*.test.ts", "*.test.ts"],
    },
  };
});
