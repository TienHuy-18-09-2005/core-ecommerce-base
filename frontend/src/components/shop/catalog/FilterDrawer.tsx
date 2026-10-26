import { X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BrandSummary, CategoryNode } from "../../../types/catalog.ts";
import { EMPTY_FILTERS, pickFilters, type CatalogFilters, type FilterPatch } from "../../../utils/catalogParams.ts";
import { FilterPanel } from "./FilterPanel.tsx";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  filters: CatalogFilters;
  categories: CategoryNode[];
  brands: BrandSummary[];
  onClose: () => void;
  /** Ghi bản nháp lên URL (một entry lịch sử). */
  onApply: (patch: FilterPatch) => void;
}

/**
 * Bộ lọc dạng drawer cho màn hình < lg. Sửa trên bản nháp; chỉ "Áp dụng" mới ghi URL.
 * Focus trap, ESC, khoá cuộn body, trả focus về nút mở. Hiệu ứng tắt theo prefers-reduced-motion (index.css).
 */
export function FilterDrawer({ filters, categories, brands, onClose, onApply }: Props) {
  const [draft, setDraft] = useState<CatalogFilters>(filters);
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (!panel.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    // Phóng to lên ≥ lg (sidebar hiện lại) → đóng drawer để không kẹt khoá cuộn.
    const wide = window.matchMedia?.("(min-width: 64rem)");
    const onWide = (e: MediaQueryListEvent) => e.matches && onCloseRef.current();
    wide?.addEventListener?.("change", onWide);
    return () => {
      wide?.removeEventListener?.("change", onWide);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  const patch = (p: Partial<CatalogFilters>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="theme-fixed absolute inset-0 animate-fade-in bg-slate-900/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        id="bo-loc-drawer"
        className="absolute inset-y-0 left-0 flex w-full max-w-sm animate-slide-in-left flex-col bg-slate-50 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <h2 id="filter-drawer-title" className="text-lg font-bold text-slate-900">Bộ lọc</h2>
          <button type="button" data-autofocus onClick={onClose} aria-label="Đóng bộ lọc" className="rounded p-1 text-slate-700 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white p-4">
          <FilterPanel
            embedded
            filters={draft}
            categories={categories}
            brands={brands}
            onChange={patch}
            onSearch={(search) => patch({ search })}
            onReset={() => patch(EMPTY_FILTERS)}
          />
        </div>
        <DrawerActions>
          <button
            type="button"
            onClick={() => onApply(EMPTY_FILTERS)}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
          >
            Xóa bộ lọc
          </button>
          <button
            type="button"
            onClick={() => onApply(pickFilters(draft))}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Áp dụng
          </button>
        </DrawerActions>
      </div>
    </div>
  );
}

function DrawerActions({ children }: { children: ReactNode }) {
  return <div className="flex gap-3 border-t border-slate-200 bg-white p-4">{children}</div>;
}
