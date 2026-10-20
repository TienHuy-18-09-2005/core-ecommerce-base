import { useSearchParams } from "react-router-dom";
import { ProductCard } from "../../components/shop/ProductCard.tsx";
import { SectionState } from "../../components/shop/SectionState.tsx";
import { useProductsQuery } from "../../hooks/useCatalogQuery.ts";

export function ProductList() {
  const [params] = useSearchParams();
  const search = params.get("search") ?? undefined;
  const categoryId = params.get("category_id") ?? undefined;
  const brandId = params.get("brand_id") ?? undefined;
  const page = params.get("page") ?? undefined;
  const products = useProductsQuery({
    search,
    category_id: categoryId,
    brand_id: brandId,
    page,
    per_page: 12,
  });

  const title = search ? `Kết quả cho “${search}”` : "Sản phẩm";

  return (
    <section aria-labelledby="danh-sach-san-pham">
      <h1 id="danh-sach-san-pham" className="mb-4 text-2xl font-bold text-slate-900">{title}</h1>
      <SectionState
        isLoading={products.isLoading}
        isError={products.isError}
        isEmpty={products.isSuccess && products.data.data.length === 0}
        onRetry={() => products.refetch()}
        emptyMessage="Không có sản phẩm khớp bộ lọc."
      >
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {products.data?.data.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </SectionState>
    </section>
  );
}
