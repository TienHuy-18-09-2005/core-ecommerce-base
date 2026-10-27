import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ApiError, mapApiError } from "../services/apiError.ts";
import { ToastContext, type ToastAction, type ToastOptions } from "./useToast.ts";

type ToastKind = "error" | "success" | "info";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string, options?: ToastOptions) => {
    const id = nextToastId;
    nextToastId += 1;
    setToasts((current) => [...current, { id, kind, message, action: options?.action }]);
    // Có nút hành động thì để lâu hơn cho kịp bấm.
    window.setTimeout(() => dismiss(id), options?.duration ?? (kind === "error" ? 7000 : options?.action ? 10000 : 4000));
  }, [dismiss]);

  const showError = useCallback((error: unknown) => {
    const apiError = error instanceof ApiError ? error : mapApiError(error);
    push("error", apiError.message);
  }, [push]);

  const showSuccess = useCallback((message: string) => {
    push("success", message);
  }, [push]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    push("info", message, options);
  }, [push]);

  const value = useMemo(
    () => ({ showError, showSuccess, showInfo }),
    [showError, showSuccess, showInfo],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Hai vùng thông báo luôn có sẵn để trình đọc màn hình bắt kịp: lỗi (assertive), còn lại (polite). */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        <div aria-live="assertive" className="flex flex-col gap-2">
          {toasts.filter((t) => t.kind === "error").map((t) => <ToastView key={t.id} toast={t} onClose={dismiss} />)}
        </div>
        <div aria-live="polite" className="flex flex-col gap-2">
          {toasts.filter((t) => t.kind !== "error").map((t) => <ToastView key={t.id} toast={t} onClose={dismiss} />)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_STYLE: Record<ToastKind, { cls: string; Icon: typeof Info }> = {
  error: { cls: "border-admin-danger-border text-admin-danger", Icon: XCircle },
  success: { cls: "border-admin-border text-admin-success", Icon: CheckCircle2 },
  info: { cls: "border-admin-border text-admin-primary", Icon: Info },
};

function ToastView({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const { cls, Icon } = TOAST_STYLE[toast.kind];
  return (
    <div role={toast.kind === "error" ? "alert" : "status"} data-kind={toast.kind}
      className={`pointer-events-auto animate-fade-in rounded-lg border bg-admin-surface px-4 py-3 text-sm shadow-lg ${cls}`}>
      <div className="flex items-start gap-3">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
        <p className="flex-1 text-admin-fg">{toast.message}</p>
        {toast.action && (
          <button type="button" onClick={() => { toast.action!.onClick(); onClose(toast.id); }}
            className="text-xs font-semibold text-admin-primary hover:underline">{toast.action.label}</button>
        )}
        <button type="button" onClick={() => onClose(toast.id)} className="text-xs font-medium text-admin-muted hover:text-admin-fg">Đóng</button>
      </div>
    </div>
  );
}
