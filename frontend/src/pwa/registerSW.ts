// Chỉ đăng ký service worker ở bản production.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  void import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true }));
}
