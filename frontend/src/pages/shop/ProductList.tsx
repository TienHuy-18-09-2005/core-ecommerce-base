import { Seo } from "../../components/common/Seo.tsx";
import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Breadcrumb, type Crumb } from "../../components/shop/catalog/Breadcrumb.tsx";
import { FilterPanel } from "../../components/shop/catalog/FilterPanel.tsx";
import { Pagination } from "../../components/shop/catalog/Pagination.tsx";
import { ProductGrid, ProductGridSkeleton } from "../../components/shop/catalog/ProductGrid.tsx";
import { useBrandsQuery, useCategoriesQuery, useProductsQuery } from "../../hooks/useCatalogQuery.ts";
import { findCategoryPath } from "../../utils/categoryTree.ts";
import {
  SORT_OPTIONS,
  parseCatalogParams,
  toApiParams,
  toSearchParams,
  updateFilters,
  type CatalogFilters,
  type SortValue,
} from "../../utils/catalogParams.ts";

export function ProductList() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseCatalogParams(params), [params]);
  const apiParams = useMemo(() => toApiParams(filters), [filters]);
  const products = useProductsQuery(apiParams);
  const categories = useCategoriesQuery();
  const brands = useBrandsQuery();

  // Lọc → thêm entry lịch sử (back/forward giữ filter)
  const change = useCallback(
    (patch: Partial<CatalogFilters>) => setParams(updateFilters(filters, patch)),
    [filters, setParams],
  );
  // Gõ search → thay entry hiện tại, tránh mỗi phím một entry lịch sử
  const search = useCallback(
    (value: string | undefined) => setParams(updateFilters(filters, { search: value }), { replace: true }),
    [filters, setParams],
  );

  const data = products.data;
  // page vượt tổng → về trang cuối (nếu có dữ liệu)
  useEffect(() => {
    if (!data || products.isPlaceholderData) return;
    if (data.total > 0 && filters.page > data.last_page) {
      setParams(toSearchParams({ ...filters, page: data.last_page }), { replace: true });
    }
  }, [data, filters, products.isPlaceholderData, setParams]);

  const categoryPath = findCategoryPath(categories.data ?? [], filters.category_id);
  const crumbs: Crumb[] = [{ label: "Trang chủ", to: "/" }, { label: "Sản phẩm", to: "/san-pham" }];
  categoryPath.forEach((c) => crumbs.push({ label: c.name, to: `/san-pham?category_id=${c.id}` }));
  if (filters.search) crumbs.push({ label: `Tìm “${filters.search}”` });

  const title = filters.search ? `Kết quả cho “${filters.search}”` : (categoryPath.at(-1)?.name ?? "Sản phẩm");

  return (
    <section aria-labelledby="danh-sach-san-pham">
      <Seo
        title={filters.page > 1 ? `${title} - Trang ${filters.page}` : title}
        description={filters.search ? `Kết quả tìm kiếm “${filters.search}” tại Core Điện.` : `Mua ${title.toLowerCase()} chính hãng tại Core Điện: giá tốt, giao nhanh, đổi trả dễ dàng.`}
        noindex={Boolean(filters.search)}
      />
      <Breadcrumb items={crumbs} />
      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <FilterPanel
          filters={filters}
          categories={categories.data ?? []}
          brands={brands.data ?? []}
          onChange={change}
          onSearch={search}
          onReset={() => setParams(new URLSearchParams())}
        />
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h1 id="danh-sach-san-pham" className="text-2xl font-bold text-slate-900">{title}</h1>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Sắp xếp:
              <select
                value={filters.sort_by}
                onChange={(e) => change({ sort_by: e.target.value as SortValue })}
                className="rounded border border-slate-300 px-2 py-1"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mb-3 min-h-5 text-sm text-slate-600">{data ? `${data.total} sản phẩm` : "\u00a0"}</p>
          <h2 className="sr-only">Danh sách sản phẩm</h2>

          {products.isPending ? <ProductGridSkeleton /> : null}
          {products.isError && !data ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-slate-700">
              <p>Không tải được danh sách sản phẩm.</p>
              <button type="button" onClick={() => products.refetch()} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">
                Thử lại
              </button>
            </div>
          ) : null}
          {data && data.data.length === 0 && (data.total === 0 || !products.isPlaceholderData) ? (
            <div className="rounded-xl bg-white p-6 text-center text-sm text-slate-600">
              <p>Không có sản phẩm khớp bộ lọc.</p>
              <button type="button" className="mt-2 text-blue-700 underline" onClick={() => setParams(new URLSearchParams())}>
                Xoá bộ lọc
              </button>
            </div>
          ) : null}
          {data && data.data.length > 0 ? (
            <>
              <ProductGrid products={data.data} dimmed={products.isPlaceholderData} />
              <Pagination page={Math.min(filters.page, data.last_page)} lastPage={data.last_page} onPage={(page) => change({ page })} />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
