export const DEFAULT_DEV_PROXY_TARGET = "http://nginx:80";

/**
 * Vite reads this on the dev server only. It is not a VITE_ variable, so the
 * browser bundle never sees the internal Docker hostname.
 * process.env wins over the frontend .env file so Compose can force nginx.
 */
function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveDevProxyTarget(sources: {
  processEnv?: string;
  fileEnv?: string;
}): string {
  return present(sources.processEnv) ?? present(sources.fileEnv) ?? DEFAULT_DEV_PROXY_TARGET;
}
