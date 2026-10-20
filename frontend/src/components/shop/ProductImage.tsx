import { useState } from "react";
import { PRODUCT_FALLBACK_SRC, safeImageUrl } from "../../utils/safeImageUrl.ts";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export function ProductImage({ src, alt, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const safe = safeImageUrl(src);
  const useFallback = failed || !safe;

  return (
    <img
      src={useFallback ? PRODUCT_FALLBACK_SRC : safe}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
