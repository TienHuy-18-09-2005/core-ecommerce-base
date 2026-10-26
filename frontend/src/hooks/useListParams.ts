import { useSearchParams } from "react-router-dom";

export type SortDirection = "asc" | "desc";
export interface SortState { field: string; direction: SortDirection }

/** Bộ lọc danh sách lưu trên URL (chia sẻ/refresh giữ nguyên); đổi lọc thì về trang 1. */
export function useListParams<K extends string>(keys: readonly K[]) {
  const [search, setSearch] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, search.get(k) ?? ""])) as Record<K, string>;
  const page = Number(search.get("page") ?? "1") || 1;

  const set = (key: K | "page", value: string) => {
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      if (key !== "page") {
        next.delete("page");
      }
      return next;
    }, { replace: true });
  };

  const sortField = search.get("sort") ?? "";
  const sort = sortField ? { field: sortField, direction: (search.get("direction") === "desc" ? "desc" : "asc") as SortDirection } : null;

  /** Bấm cột: chưa sắp → tăng dần → giảm dần → tăng dần ... ; luôn về trang 1. */
  const toggleSort = (field: string) => {
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      const dir = prev.get("sort") === field && prev.get("direction") !== "desc" ? "desc" : "asc";
      next.set("sort", field);
      next.set("direction", dir);
      next.delete("page");
      return next;
    }, { replace: true });
  };

  const sortParams = sort ? { sort: sort.field, direction: sort.direction } : {};

  return { values, page, set, setPage: (p: number) => set("page", String(p)), sort, toggleSort, sortParams };
}
