import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { safeImageUrl } from "../../../utils/safeImageUrl.ts";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 10;

/** Một ảnh trong form: đã có trên máy chủ (id) hoặc mới chọn (file + URL xem trước). */
export interface ImageItem {
  key: string;
  id?: number;
  url: string;
  file?: File;
  progress?: number;
  error?: string;
}

let seq = 0;
const newKey = () => `new-${++seq}`;

/** Kiểm tra phía client (máy chủ vẫn kiểm tra lại): JPG/PNG/WebP, ≤5MB, tổng ≤10 ảnh. */
export function validateImageFiles(files: File[], existing: number): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) errors.push(`${f.name}: chỉ nhận ảnh JPG, PNG hoặc WebP.`);
    else if (f.size > MAX_IMAGE_BYTES) errors.push(`${f.name}: ảnh vượt quá 5MB.`);
    else if (existing + accepted.length >= MAX_IMAGES) errors.push(`${f.name}: mỗi sản phẩm tối đa ${MAX_IMAGES} ảnh.`);
    else accepted.push(f);
  }
  return { accepted, errors };
}

export function ProductImagesField({ items, primaryKey, onChange, disabled }: {
  items: ImageItem[]; primaryKey: string | null; onChange: (items: ImageItem[], primaryKey: string | null) => void; disabled?: boolean;
}) {
  const inputId = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const dragFrom = useRef<number | null>(null);
  // Thu hồi URL xem trước khi gỡ component (ảnh bị xóa được thu hồi ngay lúc xóa).
  const latest = useRef(items);
  latest.current = items;
  useEffect(() => () => { latest.current.forEach((i) => i.file && URL.revokeObjectURL(i.url)); }, []);

  const addFiles = (list: FileList | File[]) => {
    const { accepted, errors: errs } = validateImageFiles(Array.from(list), items.length);
    setErrors(errs);
    if (!accepted.length) return;
    const added = accepted.map((file) => ({ key: newKey(), file, url: URL.createObjectURL(file) }));
    const next = [...items, ...added];
    onChange(next, primaryKey ?? next[0].key);
  };

  const removeAt = (i: number) => {
    const item = items[i];
    if (item.file) URL.revokeObjectURL(item.url);
    const next = items.filter((_, j) => j !== i);
    onChange(next, item.key === primaryKey ? (next[0]?.key ?? null) : primaryKey);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next, primaryKey);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const full = items.length >= MAX_IMAGES;

  return (
    <div className="space-y-3">
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm ${over ? "border-admin-primary bg-admin-subtle" : "border-admin-border"}`}>
        <ImagePlus aria-hidden className="size-8 text-admin-muted" />
        <p>Kéo thả ảnh vào đây hoặc</p>
        <label htmlFor={inputId} className={`cursor-pointer rounded-lg border border-admin-border px-3 py-1.5 font-medium text-admin-primary hover:bg-admin-subtle ${disabled || full ? "pointer-events-none opacity-50" : ""}`}>
          Chọn ảnh từ máy
        </label>
        <input id={inputId} type="file" multiple accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={disabled || full}
          aria-describedby={`${inputId}-hint`} onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        <p id={`${inputId}-hint`} className="text-xs text-admin-muted">JPG, PNG hoặc WebP · tối đa 5MB mỗi ảnh · tối đa {MAX_IMAGES} ảnh ({items.length}/{MAX_IMAGES})</p>
      </div>

      {errors.length > 0 && (
        <div role="alert"><ul className="space-y-0.5 text-xs text-admin-danger">{errors.map((m) => <li key={m}>{m}</li>)}</ul></div>
      )}

      {items.length === 0 ? <p className="text-sm text-admin-muted">Chưa có ảnh nào. Ảnh đầu tiên sẽ là ảnh chính.</p> : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Ảnh sản phẩm">
          {items.map((it, i) => (
            <li key={it.key} draggable={!disabled}
              onDragStart={() => { dragFrom.current = i; }}
              onDragOver={(e) => { if (dragFrom.current !== null) e.preventDefault(); }}
              onDrop={(e) => { if (dragFrom.current !== null) { e.preventDefault(); e.stopPropagation(); move(dragFrom.current, i); dragFrom.current = null; } }}
              onDragEnd={() => { dragFrom.current = null; }}
              className={`relative rounded-lg border p-1.5 text-xs ${it.key === primaryKey ? "border-admin-primary ring-2 ring-admin-primary/40" : "border-admin-border"}`}>
              <img src={it.file ? it.url : (safeImageUrl(it.url) ?? "/product-fallback.svg")} alt={`Ảnh ${i + 1}`} className="aspect-square w-full cursor-move rounded object-cover" />
              {it.progress !== undefined && it.progress < 100 && !it.error && (
                <progress className="mt-1 h-1.5 w-full" max={100} value={it.progress} aria-label={`Tiến độ tải ảnh ${i + 1}`} />
              )}
              {it.error && <p role="alert" className="mt-1 text-admin-danger">{it.error}</p>}
              {it.file && !it.error && it.progress === undefined && <p className="mt-1 text-admin-muted">Chưa tải lên</p>}
              <label className="mt-1 flex items-center gap-1">
                <input type="radio" name={`${inputId}-primary`} checked={it.key === primaryKey} disabled={disabled} onChange={() => onChange(items, it.key)} />
                Ảnh chính
              </label>
              <div className="mt-1 flex justify-between">
                <button type="button" className="rounded p-1 hover:bg-admin-subtle disabled:opacity-30" aria-label={`Đưa ảnh ${i + 1} lên trước`} disabled={disabled || i === 0} onClick={() => move(i, i - 1)}><ArrowLeft aria-hidden className="size-4" /></button>
                <button type="button" className="rounded p-1 text-admin-danger hover:bg-admin-subtle" aria-label={`Xóa ảnh ${i + 1}`} disabled={disabled} onClick={() => removeAt(i)}><Trash2 aria-hidden className="size-4" /></button>
                <button type="button" className="rounded p-1 hover:bg-admin-subtle disabled:opacity-30" aria-label={`Đưa ảnh ${i + 1} ra sau`} disabled={disabled || i === items.length - 1} onClick={() => move(i, i + 1)}><ArrowRight aria-hidden className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
