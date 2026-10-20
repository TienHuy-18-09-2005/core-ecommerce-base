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
