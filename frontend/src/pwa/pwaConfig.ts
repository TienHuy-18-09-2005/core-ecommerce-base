import type { VitePWAOptions } from "vite-plugin-pwa";

// Chỉ cache tài nguyên tĩnh. API/auth luôn đi mạng (không bao giờ cache).
export const NEVER_CACHE = /^\/(api|sanctum|storage|admin)(\/|$)/;

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: "autoUpdate",
  injectRegister: false,
  includeAssets: ["favicon.svg", "apple-touch-icon.png", "product-fallback.svg"],
  manifest: {
    name: "Đồ Điện Siêu Xịn",
    short_name: "Đồ Điện Siêu Xịn",
    description: "Đồ Điện Siêu Xịn — thiết bị điện chính hãng, giao nhanh.",
    lang: "vi",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
    navigateFallback: "/index.html",
    navigateFallbackDenylist: [NEVER_CACHE],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && /^\/(api|sanctum)(\/|$)/.test(url.pathname),
        handler: "NetworkOnly",
      },
    ],
  },
};
