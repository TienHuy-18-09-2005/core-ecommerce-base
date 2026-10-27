import { useEffect, useRef, useState } from "react";

export type RowId = string | number;

/**
 * Chọn nhiều hàng trên trang hiện tại. Shift-click chọn cả dải từ hàng bấm trước.
 * Đổi trang/lọc/sắp xếp (`resetKey`) thì bỏ chọn để tránh thao tác nhầm hàng không thấy.
 */
export function useSelection(ids: RowId[], resetKey: string) {
  const [selected, setSelected] = useState<Set<RowId>>(new Set());
  const anchor = useRef<RowId | null>(null);

  useEffect(() => { setSelected(new Set()); anchor.current = null; }, [resetKey]);

  // Hàng biến mất (vd. vừa xóa) thì bỏ khỏi lựa chọn.
  const key = ids.join(",");
  useEffect(() => {
    setSelected((s) => {
      const keep = [...s].filter((id) => ids.includes(id));
      return keep.length === s.size ? s : new Set(keep);
    });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: RowId, shift = false) => {
    const from = anchor.current; // đọc trước: updater chạy trễ, sau khi anchor đã đổi
    setSelected((s) => {
      const next = new Set(s);
      const on = !s.has(id);
      if (shift && from !== null && ids.includes(from)) {
        const [a, b] = [ids.indexOf(from), ids.indexOf(id)].sort((x, y) => x - y);
        ids.slice(a, b + 1).forEach((r) => (on ? next.add(r) : next.delete(r)));
      } else if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    anchor.current = id;
  };

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(ids));
  const clear = () => setSelected(new Set());

  return { selected, ids: [...selected], count: selected.size, toggle, toggleAll, allSelected, someSelected: selected.size > 0 && !allSelected, clear };
}

export type Selection = ReturnType<typeof useSelection>;
