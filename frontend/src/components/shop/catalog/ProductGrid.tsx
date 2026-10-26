import type { CatalogProduct } from "../../../types/catalog.ts";
import { ProductCard } from "../ProductCard.tsx";

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      <p className="sr-only">Đang tải sản phẩm</p>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} data-testid="product-skeleton" className="h-64 animate-pulse rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}

export function ProductGrid({ products, dimmed }: { products: CatalogProduct[]; dimmed?: boolean }) {
  return (
    <ul className={`grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 ${dimmed ? "opacity-60" : ""}`} aria-busy={dimmed || undefined}>
      {products.map((product, i) => (
        <li key={product.id}>
          {/* Hàng đầu nằm trong màn hình đầu (mobile) → tải sớm cho LCP */}
          <ProductCard product={product} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
