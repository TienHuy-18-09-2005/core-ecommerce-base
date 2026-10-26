import { useState } from "react";
import { PRODUCT_FALLBACK_SRC, safeImageUrl } from "../../utils/safeImageUrl.ts";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  /** Ảnh LCP (ảnh chính trang chi tiết): tải ngay, ưu tiên cao. */
  priority?: boolean;
  width?: number;
  height?: number;
}

/**
 * Pha 7.3: lazy-load + decoding async, nền placeholder nhấp nháy tới khi ảnh tải xong
 * rồi hiện dần. Ảnh tải lên từ admin/đánh giá được backend lưu dạng WebP.
 */
export function ProductImage({ src, alt, className = "", priority = false, width = 400, height = 400 }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const safe = safeImageUrl(src);
  const useFallback = failed || !safe;

  return (
    <img
      src={useFallback ? PRODUCT_FALLBACK_SRC : safe}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      data-loaded={loaded || undefined}
      className={`${className} bg-slate-100 transition-opacity duration-300 ${loaded ? "opacity-100" : "animate-pulse opacity-80"}`}
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0 && !loaded) setLoaded(true);
      }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
