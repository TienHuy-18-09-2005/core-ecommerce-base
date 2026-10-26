import { useSearchParams } from "react-router-dom";

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

  return { values, page, set, setPage: (p: number) => set("page", String(p)) };
}
