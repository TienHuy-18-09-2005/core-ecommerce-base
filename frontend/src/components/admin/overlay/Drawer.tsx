import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlay } from "./useOverlay.ts";

/** Ngăn kéo trượt từ cạnh màn hình; dùng cho menu (trái) và form/chi tiết phụ (phải). */
export function Drawer({ open, onClose, title, side = "right", children, footer, width = "w-96", className = "", hideTitle }: {
  open: boolean; onClose: () => void; title: string; side?: "left" | "right"; children: ReactNode; footer?: ReactNode;
  width?: string; className?: string; hideTitle?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const latest = useRef(onClose);
  latest.current = onClose;
  useOverlay(open, panel, () => latest.current());
  if (!open) return null;
  return createPortal(
    <div className={`fixed inset-0 z-50 ${className}`}>
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`absolute inset-y-0 ${side === "left" ? "left-0 animate-slide-in-left" : "right-0 animate-slide-in-right"} flex ${width} max-w-[85vw] flex-col bg-admin-surface text-admin-fg shadow-xl outline-none`}>
        <div className={`flex h-14 shrink-0 items-center justify-between gap-3 border-b border-admin-border px-4 ${hideTitle ? "sr-only" : ""}`}>
          <h2 id={titleId} className="font-semibold">{title}</h2>
          {!hideTitle && <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 text-admin-muted hover:bg-admin-subtle hover:text-admin-fg"><X aria-hidden className="size-5" /></button>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-admin-border px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
