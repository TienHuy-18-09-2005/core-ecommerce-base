import { Bookmark, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { inputClass } from "../../../utils/adminFormat.ts";
import { FormField } from "../form/FormField.tsx";
import { Popover } from "./Popover.tsx";
import { useSavedViews } from "./useTablePrefs.ts";

export type FilterDef =
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "date" };

const chip = "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium";
const chipIdle = `${chip} border-dashed border-admin-border-strong bg-admin-surface text-admin-fg-soft hover:bg-admin-subtle`;
const chipOn = `${chip} border-admin-primary bg-admin-primary/10 text-admin-primary`;

/** Ô tìm kiếm debounce (400ms), Enter áp dụng ngay; đồng bộ khi URL đổi từ nơi khác. */
export function SearchBox({ label, placeholder, value, onChange, delay = 400 }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; delay?: number }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onChange(text.trim()), delay);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative w-full sm:w-72">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted" />
      <input type="search" aria-label={label} placeholder={placeholder} className={`${inputClass} pl-9`} value={text}
        onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange(text.trim()); } }} />
    </div>
  );
}

function valueLabel(f: FilterDef, v: string) {
  if (f.type === "select") return f.options.find((o) => o.value === v)?.label ?? v;
  if (f.type === "date") return v.split("-").reverse().join("/");
  return "";
}

/** Thanh lọc dạng chip: chip trống "+ Bộ lọc" mở popover; chip đang lọc hiện giá trị và nút × bỏ lọc. */
export function FilterChips({ filters, values, onChange, onClear }: {
  filters: FilterDef[]; values: Record<string, string>; onChange: (key: string, v: string) => void; onClear: () => void;
}) {
  const anyActive = filters.some((f) => values[f.key]);
  return (
    <div role="group" aria-label="Bộ lọc" className="flex flex-wrap items-center gap-2">
      {filters.map((f) => {
        const v = values[f.key] ?? "";
        if (f.type === "toggle") {
          return <button key={f.key} type="button" aria-pressed={v === "1"} className={v === "1" ? chipOn : chipIdle} onClick={() => onChange(f.key, v === "1" ? "" : "1")}>{f.label}</button>;
        }
        return (
          <div key={f.key} className="flex items-center">
            <Popover label={`Lọc theo ${f.label.toLowerCase()}`} buttonClass={v ? `${chipOn} rounded-r-none pr-2` : chipIdle}
              button={v ? <>{f.label}: {valueLabel(f, v)}</> : <><Plus aria-hidden className="size-3.5" />{f.label}</>}>
              {(close) => (
                <FormField label={f.label}>
                  {f.type === "select" ? (
                    <select className={inputClass} value={v} onChange={(e) => { onChange(f.key, e.target.value); close(); }}>
                      <option value="">Tất cả</option>
                      {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type="date" className={inputClass} value={v} onChange={(e) => onChange(f.key, e.target.value)} />
                  )}
                </FormField>
              )}
            </Popover>
            {v && (
              <button type="button" aria-label={`Bỏ lọc ${f.label.toLowerCase()}`} className={`${chipOn} rounded-l-none border-l-0 px-2`} onClick={() => onChange(f.key, "")}>
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </div>
        );
      })}
      {anyActive && <button type="button" className="text-sm text-admin-muted underline-offset-2 hover:text-admin-fg hover:underline" onClick={onClear}>Xóa bộ lọc</button>}
    </div>
  );
}

/** Chế độ xem đã lưu: mẫu có sẵn + của người dùng (lưu qua adminPrefs), áp dụng bằng cách thay query URL. */
export function SavedViews({ tableId, presets, query, onApply }: {
  tableId: string; presets: { name: string; query: string }[]; query: string; onApply: (q: string) => void;
}) {
  const { views, save, remove } = useSavedViews(tableId);
  const [name, setName] = useState("");
  const norm = (q: string) => { const u = new URLSearchParams(q); u.delete("page"); u.sort(); return u.toString(); };
  const current = [...presets, ...views].find((v) => norm(v.query) === query);
  const item = (v: { name: string; query: string }, close: () => void) => (
    <button type="button" aria-current={current?.name === v.name ? "true" : undefined}
      className={`w-full rounded px-2 py-1.5 text-left hover:bg-admin-subtle ${current?.name === v.name ? "font-semibold text-admin-primary" : "text-admin-fg"}`}
      onClick={() => { onApply(v.query); close(); }}>{v.name}</button>
  );
  return (
    <Popover label="Chế độ xem" panelClass="w-72" buttonClass={current ? chipOn : chipIdle}
      button={<><Bookmark aria-hidden className="size-3.5" />{current ? current.name : "Xem đã lưu"}</>}>
      {(close) => (
        <div className="space-y-3">
          <ul className="space-y-0.5">
            <li>{item({ name: "Tất cả", query: "" }, close)}</li>
            {presets.map((p) => <li key={p.name}>{item(p, close)}</li>)}
          </ul>
          {views.length > 0 && (
            <ul className="space-y-0.5 border-t border-admin-border pt-2">
              {views.map((v) => (
                <li key={v.name} className="flex items-center gap-1">
                  <div className="flex-1">{item(v, close)}</div>
                  <button type="button" aria-label={`Xóa chế độ xem ${v.name}`} className="rounded p-1 text-admin-muted hover:text-admin-danger" onClick={() => remove(v.name)}><X aria-hidden className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <form className="flex items-end gap-2 border-t border-admin-border pt-3"
            onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); if (name.trim()) { save({ name: name.trim(), query }); setName(""); } }}>
            <FormField label="Lưu chế độ xem hiện tại" className="flex-1">
              <input className={inputClass} placeholder="Tên chế độ xem" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <button type="submit" className="rounded-lg bg-admin-primary px-3 py-2 text-sm font-semibold text-admin-on-primary disabled:opacity-50" disabled={!name.trim()}>Lưu</button>
          </form>
        </div>
      )}
    </Popover>
  );
}
