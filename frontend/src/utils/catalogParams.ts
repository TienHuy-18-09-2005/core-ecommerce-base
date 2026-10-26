// Đồng bộ bộ lọc catalog với URL (Pha 2, task 2.8).
// Chỉ whitelist các tham số mà backend hỗ trợ (GetProductsDTO); giá trị bẩn bị bỏ qua.

export const SORT_OPTIONS = [
  { value: "latest", label: "Mới nhất" },
  { value: "popular", label: "Phổ biến" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "name_asc", label: "Tên A → Z" },
  { value: "name_desc", label: "Tên Z → A" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

export interface CatalogFilters {
  category_id?: number;
  brand_id?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  sort_by: SortValue;
  page: number;
}

export const PER_PAGE = 12;
const MAX_SEARCH = 100;
const MAX_PRICE = 1_000_000_000;

function positiveInt(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value >= 1 && Number.isSafeInteger(value) ? value : undefined;
}

function price(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return value <= MAX_PRICE ? value : undefined;
}

function rating(raw: string | null): number | undefined {
  return raw !== null && /^[1-5]$/.test(raw) ? Number(raw) : undefined;
}

export function parseCatalogParams(params: URLSearchParams): CatalogFilters {
  const sortRaw = params.get("sort_by");
  const sort_by = SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as SortValue) : "latest";
  const search = params.get("search")?.trim().slice(0, MAX_SEARCH) || undefined;
  let min_price = price(params.get("min_price"));
  let max_price = price(params.get("max_price"));
  if (min_price !== undefined && max_price !== undefined && max_price < min_price) {
    [min_price, max_price] = [max_price, min_price];
  }

  return {
    category_id: positiveInt(params.get("category_id")),
    brand_id: positiveInt(params.get("brand_id")),
    search,
    min_price,
    max_price,
    min_rating: rating(params.get("min_rating")),
    sort_by,
    page: Math.min(positiveInt(params.get("page")) ?? 1, 10000),
  };
}

/** Thứ tự key cố định để URL ổn định và cache query không bị trùng. */
export function toSearchParams(filters: Partial<CatalogFilters>): URLSearchParams {
  const out = new URLSearchParams();
  const keys: (keyof CatalogFilters)[] = ["search", "category_id", "brand_id", "min_price", "max_price", "min_rating", "sort_by", "page"];
  for (const key of keys) {
    const value = filters[key];
    if (value === undefined || value === "") continue;
    if (key === "sort_by" && value === "latest") continue;
    if (key === "page" && value === 1) continue;
    out.set(key, String(value));
  }
  return out;
}

/** Đổi bất kỳ bộ lọc nào (trừ page) → quay về trang 1. */
export function updateFilters(current: CatalogFilters, patch: Partial<CatalogFilters>): URLSearchParams {
  const next: CatalogFilters = { ...current, ...patch };
  if (!("page" in patch)) next.page = 1;
  return toSearchParams(next);
}

export function toApiParams(filters: CatalogFilters) {
  return { ...Object.fromEntries(toSearchParams(filters)), per_page: PER_PAGE };
}

export type FilterPatch = Pick<CatalogFilters, "category_id" | "brand_id" | "search" | "min_price" | "max_price" | "min_rating">;

/** Toàn bộ bộ lọc về rỗng (giữ sort). */
export const EMPTY_FILTERS: FilterPatch = {
  category_id: undefined, brand_id: undefined, search: undefined,
  min_price: undefined, max_price: undefined, min_rating: undefined,
};

export function pickFilters(f: CatalogFilters): FilterPatch {
  const { category_id, brand_id, search, min_price, max_price, min_rating } = f;
  return { category_id, brand_id, search, min_price, max_price, min_rating };
}

export interface FilterChip {
  key: string;
  label: string;
  patch: Partial<FilterPatch>;
}

const vnd = (n: number) => n.toLocaleString("vi-VN");

/** Chip bộ lọc đang áp dụng; số chip = số bộ lọc hiển thị trên nút "Bộ lọc". */
export function activeFilterChips(
  f: CatalogFilters,
  names: { category?: string; brand?: string } = {},
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (f.search) chips.push({ key: "search", label: `“${f.search}”`, patch: { search: undefined } });
  if (f.category_id !== undefined) chips.push({ key: "category", label: names.category ?? "Danh mục", patch: { category_id: undefined } });
  if (f.brand_id !== undefined) chips.push({ key: "brand", label: names.brand ?? "Thương hiệu", patch: { brand_id: undefined } });
  if (f.min_price !== undefined || f.max_price !== undefined) {
    const label = f.min_price !== undefined && f.max_price !== undefined
      ? `${vnd(f.min_price)} – ${vnd(f.max_price)} ₫`
      : f.min_price !== undefined ? `Từ ${vnd(f.min_price)} ₫` : `Đến ${vnd(f.max_price!)} ₫`;
    chips.push({ key: "price", label, patch: { min_price: undefined, max_price: undefined } });
  }
  if (f.min_rating !== undefined) chips.push({ key: "rating", label: `Từ ${f.min_rating} sao`, patch: { min_rating: undefined } });
  return chips;
}
