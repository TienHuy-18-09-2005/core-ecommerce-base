import { useCallback, useMemo, useState, type ReactNode } from "react";
import { CartDrawerContext } from "./useCartDrawer.ts";

export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return <CartDrawerContext.Provider value={value}>{children}</CartDrawerContext.Provider>;
}
