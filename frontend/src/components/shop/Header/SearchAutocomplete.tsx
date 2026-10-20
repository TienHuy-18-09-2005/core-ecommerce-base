import { useQuery } from "@tanstack/react-query";
import { useId, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue.ts";
import { productService } from "../../../services/productService.ts";
import { formatCurrency } from "../../../utils/formatCurrency.ts";

const MIN_CHARS = 2;

/**
 * Ô tìm kiếm có gợi ý (task 2.4) theo mẫu ARIA combobox 1.2:
 * debounce 300ms, huỷ request cũ (AbortSignal), ↑/↓ chọn, Enter mở, Esc đóng.
 * Tên sản phẩm render dạng text thuần.
 */
export function SearchAutocomplete({ delayMs = 300 }: { delayMs?: number }) {
  const navigate = useNavigate();
  const listId = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = useDebouncedValue(text.trim().slice(0, 100), delayMs);
  const enabled = term.length >= MIN_CHARS;

  const suggestions = useQuery({
    queryKey: ["product-suggest", term],
    queryFn: ({ signal }) => productService.suggest(term, signal),
    enabled,
    staleTime: 60_000,
    retry: false,
  });

  const items = enabled ? (suggestions.data ?? []) : [];
  const showList = open && enabled && (items.length > 0 || suggestions.isSuccess);
  const activeItem = active >= 0 ? items[active] : undefined;

  function goSearch() {
    const q = text.trim().slice(0, 100);
    setOpen(false);
    setActive(-1);
    navigate({ pathname: "/san-pham", search: q ? `?search=${encodeURIComponent(q)}` : "" });
  }

  function goProduct(slug: string) {
    setOpen(false);
    setActive(-1);
    setText("");
    navigate(`/san-pham/${encodeURIComponent(slug)}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (items.length > 0) setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (items.length > 0) setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Escape") {
      if (open && enabled) {
        event.preventDefault();
        setOpen(false);
        setActive(-1);
      } else {
        setText("");
      }
    } else if (event.key === "Enter" && activeItem && showList) {
      event.preventDefault();
      goProduct(activeItem.slug);
    }
  }

  return (
    <form
      role="search"
      className="relative order-3 flex w-full min-w-0 flex-1 gap-2 md:order-none"
      action="/san-pham"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        goSearch();
      }}
    >
      <label htmlFor="site-search" className="sr-only">Tìm kiếm sản phẩm</label>
      <input
        id="site-search"
        name="search"
        type="search"
        role="combobox"
        autoComplete="off"
        maxLength={100}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && activeItem ? `${listId}-opt-${activeItem.id}` : undefined}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        placeholder="Tìm kiếm sản phẩm..."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900"
      />
      <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
        Tìm
      </button>
      <ul
        id={listId}
        role="listbox"
        aria-label="Gợi ý sản phẩm"
        hidden={!showList}
        className="absolute left-0 right-16 top-full z-50 mt-1 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
      >
        {items.map((item, index) => {
          const price = item.min_price === null || item.min_price === undefined ? null : Number(item.min_price);
          return (
            <li
              key={item.id}
              id={`${listId}-opt-${item.id}`}
              role="option"
              aria-selected={index === active}
              // mousedown + preventDefault: chọn trước khi input blur đóng danh sách
              onMouseDown={(e) => {
                e.preventDefault();
                goProduct(item.slug);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                index === active ? "bg-blue-50 text-blue-800" : "text-slate-800"
              }`}
            >
              <span className="line-clamp-1">{item.name}</span>
              {price !== null && Number.isFinite(price) ? (
                <span className="shrink-0 tabular-nums text-red-600">{formatCurrency(price)}</span>
              ) : null}
            </li>
          );
        })}
        {suggestions.isSuccess && items.length === 0 ? (
          <li role="presentation" className="px-3 py-2 text-sm text-slate-500">Không có gợi ý. Nhấn Enter để tìm.</li>
        ) : null}
      </ul>
    </form>
  );
}
