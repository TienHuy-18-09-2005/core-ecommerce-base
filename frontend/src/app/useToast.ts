import { createContext, useContext } from "react";

export interface ToastContextValue {
  showError: (error: unknown) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải nằm trong ToastProvider.");
  }

  return context;
}
