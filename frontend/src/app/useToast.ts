import { createContext, useContext } from "react";

export interface ToastAction { label: string; onClick: () => void }
export interface ToastOptions { action?: ToastAction; duration?: number }

export interface ToastContextValue {
  showError: (error: unknown) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải nằm trong ToastProvider.");
  }

  return context;
}
