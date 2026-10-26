import { useState } from "react";

const LABELS = ["Rất tệ", "Tệ", "Bình thường", "Tốt", "Rất tốt"];

interface Props {
  value: number;
  /** Có onChange → chế độ chọn sao (radio), không có → chỉ hiển thị. */
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  name?: string;
  label?: string;
  error?: string;
}

const SIZES = { sm: "text-sm", md: "text-lg", lg: "text-2xl" } as const;

export function StarRating({ value, onChange, size = "md", name = "rating", label = "Số sao", error }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  if (!onChange) {
    const rounded = Math.max(0, Math.min(5, Math.round(value)));
    return (
      <span role="img" aria-label={`${value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} trên 5 sao`} className={`${SIZES[size]} text-amber-500`}>
        <span aria-hidden="true">{"★".repeat(rounded)}<span className="text-slate-300">{"★".repeat(5 - rounded)}</span></span>
      </span>
    );
  }

  const shown = hover ?? value;
  const errorId = `${name}-error`;
  return (
    <fieldset aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-1 flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className={`cursor-pointer ${SIZES[size]} ${star <= shown ? "text-amber-500" : "text-slate-300"}`} onMouseEnter={() => setHover(star)}>
            <input type="radio" className="sr-only" name={name} value={star} checked={value === star} onChange={() => onChange(star)} aria-label={`${star} sao – ${LABELS[star - 1]}`} />
            <span aria-hidden="true">★</span>
          </label>
        ))}
        {shown > 0 ? <span className="ml-2 text-sm text-slate-600">{LABELS[shown - 1]}</span> : null}
      </div>
      {error ? <span id={errorId} className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </fieldset>
  );
}
