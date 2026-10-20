import { useEffect, useRef, useState } from "react";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.ts";

interface Props {
  value?: string;
  onSearch: (value: string | undefined) => void;
  delayMs?: number;
}

/** Ô tìm kiếm debounce 300ms (task 2.4). Chỉ gọi onSearch khi giá trị thực sự đổi → không request trùng. */
export function SearchBar({ value, onSearch, delayMs = 300 }: Props) {
  const [text, setText] = useState(value ?? "");
  const debounced = useDebouncedValue(text, delayMs);
  const lastSent = useRef(value ?? "");

  // URL đổi từ bên ngoài (back/forward, header search) → đồng bộ ô nhập (điều chỉnh state lúc render)
  const [syncedValue, setSyncedValue] = useState(value ?? "");
  if ((value ?? "") !== syncedValue) {
    setSyncedValue(value ?? "");
    if ((value ?? "") !== text.trim()) setText(value ?? "");
  }
  useEffect(() => {
    lastSent.current = value ?? "";
  }, [value]);

  useEffect(() => {
    const next = debounced.trim().slice(0, 100);
    if (next === lastSent.current) return;
    lastSent.current = next;
    onSearch(next || undefined);
  }, [debounced, onSearch]);

  return (
    <div>
      <label htmlFor="catalog-search" className="mb-1 block text-sm font-semibold text-slate-800">Tìm trong danh sách</label>
      <input
        id="catalog-search"
        type="search"
        maxLength={100}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tên sản phẩm..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
