import type { BrandSummary, CategoryNode } from "../../../types/catalog.ts";
import type { CatalogFilters } from "../../../utils/catalogParams.ts";
import { CategorySidebar } from "./CategorySidebar.tsx";
import { PriceRange } from "./PriceRange.tsx";
import { SearchBar } from "./SearchBar.tsx";

interface Props {
  filters: CatalogFilters;
  categories: CategoryNode[];
  brands: BrandSummary[];
  onChange: (patch: Partial<CatalogFilters>) => void;
  onSearch: (value: string | undefined) => void;
  onReset: () => void;
}

/** Bộ lọc: CHỈ category_id, brand_id, search, min_price, max_price (task 2.2). Lọc rating dựa trên review đã duyệt. */
export function FilterPanel({ filters, categories, brands, onChange, onSearch, onReset }: Props) {
  return (
    <aside aria-label="Bộ lọc" className="space-y-5 rounded-xl bg-white p-4">
      <SearchBar value={filters.search} onSearch={onSearch} />
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Danh mục</h2>
        <CategorySidebar categories={categories} selectedId={filters.category_id} onSelect={(id) => onChange({ category_id: id })} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Thương hiệu</h2>
        <ul className="space-y-1">
          {brands.map((brand) => (
            <li key={brand.id}>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="brand"
                  checked={filters.brand_id === brand.id}
                  onChange={() => onChange({ brand_id: brand.id })}
                />
                {brand.name}
              </label>
            </li>
          ))}
        </ul>
        {filters.brand_id !== undefined ? (
          <button type="button" className="mt-1 text-xs text-blue-700 underline" onClick={() => onChange({ brand_id: undefined })}>
            Bỏ chọn thương hiệu
          </button>
        ) : null}
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Khoảng giá (VND)</h2>
        <PriceRange min={filters.min_price} max={filters.max_price} onApply={(min_price, max_price) => onChange({ min_price, max_price })} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-800">Đánh giá</h2>
        <ul className="space-y-1">
          {[4, 3, 2, 1].map((stars) => (
            <li key={stars}>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="min_rating"
                  checked={filters.min_rating === stars}
                  onChange={() => onChange({ min_rating: stars })}
                />
                <span aria-hidden="true" className="text-amber-500">{"★".repeat(stars)}{"☆".repeat(5 - stars)}</span>
                <span>Từ {stars} sao</span>
              </label>
            </li>
          ))}
        </ul>
        {filters.min_rating !== undefined ? (
          <button type="button" className="mt-1 text-xs text-blue-700 underline" onClick={() => onChange({ min_rating: undefined })}>
            Bỏ lọc đánh giá
          </button>
        ) : null}
      </section>
      <button type="button" onClick={onReset} className="w-full rounded border border-slate-300 px-3 py-1 text-sm text-slate-700">
        Xoá bộ lọc
      </button>
    </aside>
  );
}
