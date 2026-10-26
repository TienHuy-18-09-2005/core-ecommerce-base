import { useLocation, useMatches } from "react-router-dom";
import { absoluteUrl, clampDescription, fullTitle, type RouteSeoHandle, type SeoMeta, SITE_NAME } from "../../utils/seo.ts";

/**
 * Metadata gốc của React 19: <title>/<meta>/<link> render ở bất kỳ đâu sẽ được
 * hoist lên <head> và gỡ khi component unmount — không cần react-helmet.
 */
export function Seo({ title, description, image, type = "website", noindex }: SeoMeta) {
  const location = useLocation();
  const t = fullTitle(title);
  const d = clampDescription(description);
  const url = absoluteUrl(location.pathname);
  const img = absoluteUrl(image ?? "/pwa-512.png");
  return (
    <>
      <title>{t}</title>
      <meta name="description" content={d} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {url && !noindex && <link rel="canonical" href={url} />}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="vi_VN" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={t} />
      <meta property="og:description" content={d} />
      {url && <meta property="og:url" content={url} />}
      {img && <meta property="og:image" content={img} />}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
    </>
  );
}

/** Render Seo theo handle của route sâu nhất (trang tĩnh); trang động tự render. */
export function RouteSeo() {
  const matches = useMatches();
  const handle = [...matches].reverse().find((m) => (m.handle as RouteSeoHandle | undefined)?.seo)?.handle as RouteSeoHandle | undefined;
  if (!handle || handle.seo === "page") return null;
  return <Seo {...handle.seo} />;
}
