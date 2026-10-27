import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Nút mở bảng nổi nhỏ (lọc, cột, chế độ xem). ESC hoặc bấm ra ngoài để đóng, trả focus về nút. */
export function Popover({ label, button, buttonClass, children, align = "left", panelClass = "w-64" }: {
  label: string; button: ReactNode; buttonClass: string; children: (close: () => void) => ReactNode; align?: "left" | "right"; panelClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = () => { setOpen(false); btn.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>("[data-popover-panel] input, [data-popover-panel] select, [data-popover-panel] button")?.focus();
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button ref={btn} type="button" className={buttonClass} aria-expanded={open} aria-controls={open ? id : undefined} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        {button}
      </button>
      {open && (
        <div id={id} role="dialog" aria-label={label} data-popover-panel
          className={`absolute z-30 mt-2 rounded-xl border border-admin-border bg-admin-surface p-3 text-sm shadow-lg ${align === "right" ? "right-0" : "left-0"} ${panelClass}`}>
          {children(close)}
        </div>
      )}
    </div>
  );
}
