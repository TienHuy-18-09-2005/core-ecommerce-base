import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let locks = 0;
let savedOverflow = "";
/** Ngăn xếp lớp phủ đang mở: chỉ lớp trên cùng nhận ESC/Tab. */
const stack: object[] = [];

/** Dùng chung cho Modal và Drawer: bẫy focus, ESC để đóng, trả focus, khóa cuộn trang. */
export function useOverlay(open: boolean, panel: RefObject<HTMLElement | null>, onClose: () => void, initialFocus?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const token = {};
    stack.push(token);
    const opener = document.activeElement as HTMLElement | null;
    const first = initialFocus?.current ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panel.current;
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token || !panel.current) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab") return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) { e.preventDefault(); return; }
      const a = items[0], b = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === a || !panel.current.contains(document.activeElement))) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && (document.activeElement === b || !panel.current.contains(document.activeElement))) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    if (locks++ === 0) { savedOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(token), 1);
      if (--locks === 0) document.body.style.overflow = savedOverflow;
      opener?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}
