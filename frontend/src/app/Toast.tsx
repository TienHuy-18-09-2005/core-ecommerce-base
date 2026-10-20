import { useCallback, useMemo, useState, type ReactNode } from "react";
import { ApiError, mapApiError } from "../services/apiError.ts";
import { ToastContext } from "./useToast.ts";

type ToastKind = "error" | "success";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextToastId;
    nextToastId += 1;
    setToasts((current) => [...current, { id, kind, message }]);
    window.setTimeout(() => dismiss(id), 5000);
  }, [dismiss]);

  const showError = useCallback((error: unknown) => {
    const apiError = error instanceof ApiError ? error : mapApiError(error);
    push("error", apiError.message);
  }, [push]);

  const showSuccess = useCallback((message: string) => {
    push("success", message);
  }, [push]);

  const value = useMemo(
    () => ({ showError, showSuccess }),
    [showError, showSuccess],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.kind === "error"
                ? "border-red-200 bg-white text-red-700"
                : "border-green-200 bg-white text-green-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p>{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                Đóng
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
