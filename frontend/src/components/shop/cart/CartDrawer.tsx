import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCartDrawer } from "../../../app/useCartDrawer.ts";
import { useCartQuery } from "../../../hooks/useCartQuery.ts";
import { CartLineItem } from "./CartLineItem.tsx";
import { CartSummaryBox } from "./CartSummaryBox.tsx";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Task 3.2: drawer có focus trap, ESC để đóng, trả focus về nút đã mở. */
export function CartDrawer() {
  const { isOpen, close } = useCartDrawer();
  const cart = useCartQuery();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel.current) {
        return;
      }
      const nodes = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) {
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [isOpen, close]);

  if (!isOpen) {
    return null;
  }

  const items = cart.data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={close} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-slate-50 shadow-xl"
      >
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 id="cart-drawer-title" className="text-lg font-bold">Giỏ hàng</h2>
          <button type="button" onClick={close} aria-label="Đóng giỏ hàng" className="rounded p-1 hover:bg-slate-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {cart.isLoading ? <p>Đang tải giỏ hàng...</p> : null}
          {cart.isSuccess && items.length === 0 ? <p className="text-slate-600">Giỏ hàng đang trống.</p> : null}
          <ul className="space-y-3">
            {items.map((line) => <CartLineItem key={line.id} line={line} compact />)}
          </ul>
        </div>
        {cart.data?.summary && items.length > 0 ? (
          <div className="border-t bg-white p-4">
            <CartSummaryBox summary={cart.data.summary} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/gio-hang" onClick={close} className="rounded-lg border border-blue-600 px-3 py-2 text-center font-semibold text-blue-700">
                Xem giỏ hàng
              </Link>
              {cart.data.summary.has_issues ? (
                <span className="rounded-lg bg-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-500" aria-disabled="true">
                  Cập nhật giỏ để thanh toán
                </span>
              ) : (
                <Link to="/thanh-toan" onClick={close} className="rounded-lg bg-blue-600 px-3 py-2 text-center font-semibold text-white">
                  Thanh toán
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
