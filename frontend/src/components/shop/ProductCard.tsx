import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAddToCartMutation } from "../../hooks/useCartQuery.ts";
import type { CatalogProduct } from "../../types/catalog.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { ProductImage } from "./ProductImage.tsx";

function amount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const addToCart = useAddToCartMutation();
  const price = amount(product.default_variant_price) ?? amount(product.min_price);
  const compare = amount(product.default_compare_at_price);
  const showCompare = compare !== null && price !== null && compare > price;
  const variantId = product.default_variant_id;

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <Link to={`/san-pham/${product.slug}`} className="block">
        <ProductImage
          src={product.thumbnail_url}
          alt=""
          className="aspect-square w-full rounded-lg bg-slate-100 object-cover"
        />
        <h3 className="mt-3 line-clamp-2 text-base font-semibold text-slate-900">{product.name}</h3>
      </Link>
      <p className="mt-2 text-lg font-bold text-red-600 tabular-nums">
        {price === null ? "Liên hệ" : formatCurrency(price)}
        {product.unit ? <span className="ml-1 text-sm font-medium text-slate-500">/ {product.unit}</span> : null}
      </p>
      {showCompare ? (
        <p className="text-sm text-slate-600 line-through tabular-nums">{formatCurrency(compare)}</p>
      ) : null}
      <div className="mt-auto pt-3">
        {variantId ? (
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            disabled={addToCart.isPending}
            onClick={() => addToCart.mutate({ productVariantId: variantId, quantity: 1 })}
          >
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            {addToCart.isPending ? "Đang thêm..." : "Thêm vào giỏ"}
          </button>
        ) : (
          <Link
            to={`/san-pham/${product.slug}`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-blue-600 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            Xem sản phẩm
          </Link>
        )}
      </div>
    </article>
  );
}
