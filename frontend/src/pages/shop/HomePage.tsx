import { Link } from "react-router-dom";
import { BannerSlider } from "../../components/shop/BannerSlider.tsx";
import { ProductCard } from "../../components/shop/ProductCard.tsx";
import { SectionState } from "../../components/shop/SectionState.tsx";
import { useBrandsQuery, useCategoriesQuery, useProductsQuery } from "../../hooks/useCatalogQuery.ts";
import { featuredDepartments } from "../../types/catalog.ts";

export function HomePage() {
  const categories = useCategoriesQuery();
  const brands = useBrandsQuery();
  const featured = useProductsQuery({ is_featured: 1, per_page: 8 });
  const departments = featuredDepartments(categories.data ?? []);

  return (
    <div className="space-y-10">
      <BannerSlider />

      <section aria-labelledby="danh-muc">
        <h2 id="danh-muc" className="mb-4 text-2xl font-bold text-slate-900">Danh mục nổi bật</h2>
        <SectionState
          isLoading={categories.isLoading}
          isError={categories.isError}
          isEmpty={categories.isSuccess && departments.length === 0}
          onRetry={() => categories.refetch()}
          emptyMessage="Chưa có danh mục để hiển thị."
        >
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {departments.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/san-pham?category_id=${category.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 text-center font-semibold text-slate-800 hover:border-blue-600"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </SectionState>
      </section>

      <section aria-labelledby="noi-bat">
        <h2 id="noi-bat" className="mb-4 text-2xl font-bold text-slate-900">Sản phẩm nổi bật</h2>
        <SectionState
          isLoading={featured.isLoading}
          isError={featured.isError}
          isEmpty={featured.isSuccess && featured.data.data.length === 0}
          onRetry={() => featured.refetch()}
          emptyMessage="Chưa có sản phẩm nổi bật."
        >
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {featured.data?.data.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        </SectionState>
      </section>

      <section aria-labelledby="thuong-hieu">
        <h2 id="thuong-hieu" className="mb-4 text-2xl font-bold text-slate-900">Thương hiệu đối tác</h2>
        <SectionState
          isLoading={brands.isLoading}
          isError={brands.isError}
          isEmpty={brands.isSuccess && brands.data.length === 0}
          onRetry={() => brands.refetch()}
          emptyMessage="Chưa có thương hiệu."
        >
          <ul className="flex flex-wrap gap-3">
            {brands.data?.map((brand) => (
              <li key={brand.id}>
                <Link
                  to={`/san-pham?brand_id=${brand.id}`}
                  className="inline-flex min-h-12 items-center rounded-full border border-slate-200 bg-white px-4 font-semibold text-slate-800 hover:border-blue-600"
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>
        </SectionState>
      </section>
    </div>
  );
}
