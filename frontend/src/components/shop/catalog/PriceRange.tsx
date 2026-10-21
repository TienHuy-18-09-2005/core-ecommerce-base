import { useState, type FormEvent } from "react";

interface Props {
  min?: number;
  max?: number;
  onApply: (min: number | undefined, max: number | undefined) => void;
}

function toNumber(raw: string): number | undefined {
  const digits = raw.replace(/\D/g, "");
  return digits ? Math.min(Number(digits), 1_000_000_000) : undefined;
}

export function PriceRange({ min, max, onApply }: Props) {
  const [minText, setMinText] = useState(min?.toString() ?? "");
  const [maxText, setMaxText] = useState(max?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  const [synced, setSynced] = useState(`${min ?? ""}-${max ?? ""}`);
  if (synced !== `${min ?? ""}-${max ?? ""}`) {
    setSynced(`${min ?? ""}-${max ?? ""}`);
    setMinText(min?.toString() ?? "");
    setMaxText(max?.toString() ?? "");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const lo = toNumber(minText);
    const hi = toNumber(maxText);
    if (lo !== undefined && hi !== undefined && hi < lo) {
      setError("Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.");
      return;
    }
    setError(null);
    onApply(lo, hi);
  }

  return (
    <form onSubmit={submit} aria-label="Khoảng giá" className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="min-price">Giá từ</label>
        <input id="min-price" inputMode="numeric" placeholder="Từ" value={minText} onChange={(e) => setMinText(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
        <span aria-hidden="true">–</span>
        <label className="sr-only" htmlFor="max-price">Giá đến</label>
        <input id="max-price" inputMode="numeric" placeholder="Đến" value={maxText} onChange={(e) => setMaxText(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
      </div>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
      <button type="submit" className="w-full rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white">Áp dụng</button>
    </form>
  );
}
