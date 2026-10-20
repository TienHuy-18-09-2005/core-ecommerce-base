export function legacyProductLocation(url: string): string | null {
  const [path, query] = url.split("?");
  const match = path?.match(/^\/products\/([^/]+)\/?$/);
  const slug = match?.[1];
  if (!slug) {
    return null;
  }

  const next = `/san-pham/${slug}`;
  return query ? `${next}?${query}` : next;
}
