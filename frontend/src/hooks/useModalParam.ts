import { useSearchParams } from "react-router-dom";

/**
 * Biểu mẫu thêm/sửa mở dạng modal, trạng thái nằm trên URL để chia sẻ/refresh được:
 * `?them=1` = thêm mới, `?sua=ID` = sửa. Các tham số lọc khác giữ nguyên.
 */
export function useModalParam() {
  const [search, setSearch] = useSearchParams();
  const raw = search.get("sua");
  const editId = raw && /^\d+$/.test(raw) ? Number(raw) : null;
  const mode: "create" | "edit" | null = editId !== null ? "edit" : search.get("them") === "1" ? "create" : null;

  const write = (id: number | "new" | null, replace: boolean) =>
    setSearch((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("sua");
      next.delete("them");
      next.delete("tab");
      if (id === "new") next.set("them", "1");
      else if (id !== null) next.set("sua", String(id));
      return next;
    }, { replace });

  return {
    mode,
    editId,
    openCreate: () => write("new", false),
    openEdit: (id: number) => write(id, false),
    close: () => write(null, true),
  };
}
