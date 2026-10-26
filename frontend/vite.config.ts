import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv, type Connect, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { resolveDevProxyTarget } from "./devProxyTarget.ts";
import { legacyProductLocation } from "./src/utils/legacyProductLocation.ts";

function legacyProductRedirect(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const target = legacyProductLocation(req.url ?? "");
    if (!target) {
      next();
      return;
    }

    res.statusCode = 301;
    res.setHeader("Location", target);
    res.end();
  };

  return {
    name: "legacy-product-redirect",
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function proxyOptions(target: string) {
  return {
    target,
    // Keep the browser Host so Laravel builds links for Vite, not the
    // Docker DNS name "nginx".
    changeOrigin: false,
    // Drop Domain=localhost so the browser stores a host-only cookie for
    // whichever host opened Vite (localhost or 127.0.0.1).
    cookieDomainRewrite: "",
  };
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, __dirname, "");
  const proxyTarget = resolveDevProxyTarget({
    processEnv: process.env.DEV_PROXY_TARGET,
    fileEnv: fileEnv.DEV_PROXY_TARGET,
  });

  return {
    appType: "spa",
    plugins: [react(), tailwindcss(), legacyProductRedirect()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    server: {
      host: true,
      port: 5173,
      // Docker bind mounts often miss inotify events. The container sets this.
      watch: process.env.CHOKIDAR_USEPOLLING === "true" ? { usePolling: true } : undefined,
      proxy: {
        "/api": proxyOptions(proxyTarget),
        "/sanctum": proxyOptions(proxyTarget),
        // Ảnh đánh giá (storage:link) do nginx phục vụ
        "/storage": proxyOptions(proxyTarget),
      },
    },

    test: {
      environment: "node",
      setupFiles: ["./testSetup.ts"],
      include: ["src/**/*.test.ts", "src/**/*.test.tsx", "*.test.ts"],
    },
  };
});
