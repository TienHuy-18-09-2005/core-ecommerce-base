import { createContext, useContext } from "react";

export interface CartDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const CartDrawerContext = createContext<CartDrawerContextValue | null>(null);

/** Ngoài ShopLayout (vd. test đơn lẻ) trả về no-op để component vẫn dùng được. */
export function useCartDrawer(): CartDrawerContextValue {
  return useContext(CartDrawerContext) ?? { isOpen: false, open: () => {}, close: () => {} };
}
