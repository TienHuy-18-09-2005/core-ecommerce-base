export const SITE_NAME = "Core Điện";
export const DEFAULT_DESCRIPTION = "Core Điện — cửa hàng thiết bị điện chính hãng: đèn LED, dây cáp, công tắc, ổ cắm. Giao nhanh, đổi trả dễ dàng.";

export interface SeoMeta {
  title?: string;
  description?: string;
  image?: string | null;
  type?: "website" | "product" | "article";
  noindex?: boolean;
}

/** handle.seo trên route: object = layout tự render; "page" = trang tự render <Seo>. */
export type RouteSeoHandle = { seo: SeoMeta | "page" };

export function fullTitle(title?: string): string {
  return title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Thiết bị điện chính hãng`;
}

export function clampDescription(text: string | null | undefined, max = 160): string {
  const clean = (text ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!clean) return DEFAULT_DESCRIPTION;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function absoluteUrl(path: string | null | undefined): string | undefined {
  if (!path || typeof window === "undefined") return undefined;
  try {
    const url = new URL(path, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
