import { AlertTriangle, X } from "lucide-react";
import { createContext, useCallback, useContext, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { btnPrimary, btnSecondary } from "../../../utils/adminFormat.ts";
import { useOverlay } from "./useOverlay.ts";

export function Modal({ open, onClose, title, description, children, footer, size = "md", role = "dialog", initialFocus }: {
  open: boolean; onClose: () => void; title: string; description?: ReactNode; children?: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl"; role?: "dialog" | "alertdialog"; initialFocus?: React.RefObject<HTMLElement | null>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const latestClose = useRef(onClose);
  latestClose.current = onClose;
  useOverlay(open, panel, () => latestClose.current(), initialFocus);
  if (!open) return null;
  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : size === "xl" ? "max-w-5xl" : "max-w-lg";
  // Biểu mẫu lớn: gần toàn màn hình trên điện thoại/máy tính bảng hẹp, thân cuộn riêng, chân cố định.
  const big = size === "lg" || size === "xl";
  return createPortal(
    <div className={`fixed inset-0 z-[60] flex items-end justify-center sm:items-center ${big ? "p-0 sm:p-4" : "p-4"}`}>
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div ref={panel} role={role} aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined} tabIndex={-1}
        className={`relative flex w-full ${width} animate-fade-in flex-col border border-admin-border bg-admin-surface text-admin-fg shadow-xl outline-none ${big ? "h-[100dvh] rounded-none sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl" : "max-h-[calc(100dvh-2rem)] rounded-xl"}`}>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-5">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="-mr-2 -mt-1 rounded-lg p-2 text-admin-muted hover:bg-admin-subtle hover:text-admin-fg"><X aria-hidden className="size-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 text-sm text-admin-fg-soft">
          {description && <div id={descId}>{description}</div>}
          {children}
        </div>
        {footer && <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-admin-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Kiểu nguy hiểm (xóa, hủy): nút đỏ, focus mặc định vào nút "Không". */
  danger?: boolean;
}

const danger = "rounded-lg bg-admin-danger px-4 py-2 text-sm font-semibold text-admin-on-primary hover:opacity-90 disabled:opacity-50";

export function ConfirmModal({ open, onConfirm, onCancel, title, message, confirmLabel = "Xác nhận", cancelLabel = "Hủy bỏ", danger: isDanger }: ConfirmOptions & { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm" role="alertdialog" initialFocus={isDanger ? cancelRef : okRef}
      description={<div className="flex gap-3">{isDanger && <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-admin-danger" />}<div>{message}</div></div>}
      footer={<>
        <button ref={cancelRef} type="button" className={btnSecondary} onClick={onCancel}>{cancelLabel}</button>
        <button ref={okRef} type="button" className={isDanger ? danger : btnPrimary} onClick={onConfirm}>{confirmLabel}</button>
      </>} />
  );
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Cung cấp `useConfirm()` dạng promise, thay cho window.confirm. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback<ConfirmFn>((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const finish = (v: boolean) => { state?.resolve(v); setState(null); };
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <ConfirmModal open {...state} onConfirm={() => finish(true)} onCancel={() => finish(false)} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm phải nằm trong ConfirmProvider.");
  return ctx;
}
