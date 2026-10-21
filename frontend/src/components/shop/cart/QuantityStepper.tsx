import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  max?: number;
  label: string;
  disabled?: boolean;
  /** Gọi sau khi người dùng ngừng bấm `delayMs` ms — gộp nhiều lần +/− thành 1 request. */
  onCommit: (quantity: number) => void;
  delayMs?: number;
}

export function QuantityStepper({ value, max, label, disabled, onCommit, delayMs = 400 }: Props) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<number | null>(null);
  const [prevValue, setPrevValue] = useState(value);

  // Server trả số lượng mới → đồng bộ lại bản nháp
  if (prevValue !== value) {
    setPrevValue(value);
    setDraft(value);
  }

  useEffect(() => () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
  }, []);

  const change = (next: number) => {
    const upper = max !== undefined ? Math.max(max, 1) : 999;
    const clamped = Math.min(Math.max(1, next), upper);
    setDraft(clamped);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (clamped !== value) {
        onCommit(clamped);
      }
    }, delayMs);
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-300" role="group" aria-label={label}>
      <button
        type="button"
        className="p-2 disabled:opacity-40"
        aria-label="Giảm số lượng"
        disabled={disabled || draft <= 1}
        onClick={() => change(draft - 1)}
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-8 text-center tabular-nums" aria-live="polite">{draft}</span>
      <button
        type="button"
        className="p-2 disabled:opacity-40"
        aria-label="Tăng số lượng"
        disabled={disabled || (max !== undefined && draft >= max)}
        onClick={() => change(draft + 1)}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
