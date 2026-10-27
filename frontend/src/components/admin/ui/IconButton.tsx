import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

const DELAY = 150;

/** Tooltip hiện phía trên phần tử khi di chuột hoặc focus bàn phím; ESC để ẩn. Render qua portal nên không làm xô lệch bố cục. */
export function useTooltip(text: string) {
  const id = useId();
  const anchor = useRef<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const show = useCallback(() => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), DELAY); }, []);
  const hide = useCallback(() => { window.clearTimeout(timer.current); setOpen(false); }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", hide, true); };
  }, [open, hide]);
  const handlers = { onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide, "aria-describedby": open ? id : undefined };
  const node = open && anchor.current ? <TooltipBubble id={id} text={text} anchor={anchor.current} /> : null;
  return { anchor, handlers, node };
}

function TooltipBubble({ id, text, anchor }: { id: string; text: string; anchor: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  useLayoutEffect(() => {
    const a = anchor.getBoundingClientRect();
    const t = ref.current!.getBoundingClientRect();
    const margin = 6;
    let left = a.left + a.width / 2 - t.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - t.width - margin));
    let top = a.top - t.height - margin;
    const below = top < margin;
    if (below) top = a.bottom + margin;
    setPos({ left, top, below });
  }, [anchor, text]);
  return createPortal(
    <div ref={ref} id={id} role="tooltip"
      className="pointer-events-none fixed z-[1000] whitespace-nowrap rounded-md bg-admin-fg px-2 py-1 text-xs font-medium text-admin-surface shadow-md"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999, visibility: "hidden" }}>
      {text}
    </div>,
    document.body,
  );
}

export function Tooltip({ text, children }: { text: string; children: (p: ReturnType<typeof useTooltip>["handlers"] & { ref: (el: HTMLElement | null) => void }) => ReactNode }) {
  const t = useTooltip(text);
  return <>{children({ ...t.handlers, ref: (el) => { t.anchor.current = el; } })}{t.node}</>;
}

const base = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary focus-visible:ring-offset-1 focus-visible:ring-offset-admin-surface aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-transparent";
const tones = {
  default: "text-admin-fg-soft hover:bg-admin-subtle hover:text-admin-fg",
  danger: "text-admin-danger hover:bg-admin-danger-subtle",
};

type Props = {
  /** Nhãn ngắn hiện trong tooltip. */
  label: string;
  /** Nhãn đầy đủ cho trình đọc màn hình, mặc định = label. */
  ariaLabel?: string;
  icon: ReactNode;
  tone?: keyof typeof tones;
  disabled?: boolean;
  onClick?: () => void;
  href?: string;
  external?: boolean;
};

export function IconButton({ label, ariaLabel, icon, tone = "default", disabled, onClick, href, external }: Props) {
  const t = useTooltip(label);
  const cls = `${base} ${tones[tone]}`;
  const setRef = (el: HTMLElement | null) => { t.anchor.current = el; };
  const content = <span aria-hidden="true" className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>;
  return (
    <>
      {href && !disabled
        ? external
          ? <a ref={setRef} href={href} className={cls} aria-label={ariaLabel ?? label} {...t.handlers} target="_blank" rel="noreferrer">{content}</a>
          : <Link ref={setRef} to={href} className={cls} aria-label={ariaLabel ?? label} {...t.handlers}>{content}</Link>
        : <button ref={setRef} type="button" className={cls} aria-label={ariaLabel ?? label} aria-disabled={disabled || undefined} onClick={disabled ? undefined : onClick} {...t.handlers}>{content}</button>}
      {t.node}
    </>
  );
}

export function IconActions({ children }: { children: ReactNode }) {
  return <div className="grid w-max grid-cols-2 gap-0.5 xl:flex xl:items-center">{children}</div>;
}
