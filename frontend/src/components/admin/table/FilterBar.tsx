import { Bookmark, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { inputClass } from "../../../utils/adminFormat.ts";
import { FormField } from "../form/FormField.tsx";
import { Popover } from "./Popover.tsx";
import { useSavedViews } from "./useTablePrefs.ts";
import { ctlIdle, ctlOn, ghostBtn, toolBtn, toolBtnOn, toolLabel } from "./toolbarStyles.ts";

export type FilterDef =
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "toggle" }
  | { key: string; label: string; type: "date" }
  | { key: string; label: string; type: "daterange"; fromKey: string; toKey: string };


/** Ô tìm kiếm debounce (400ms), Enter áp dụng ngay; đồng bộ khi URL đổi từ nơi khác. */
export function SearchBox({ label, placeholder, value, onChange, delay = 400 }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; delay?: number }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onChange(text.trim()), delay);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const id = useId();
  return (
    <div className="w-full sm:w-72 xl:w-[240px] xl:shrink-0 2xl:w-[280px]">
      <label htmlFor={id} className={`${toolLabel} mb-1`}>{label}</label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted" />
        <input id={id} type="search" placeholder={placeholder} className={`${ctlIdle} w-full pl-9`} value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onChange(text.trim()); } }} />
      </div>
    </div>
  );
}


/** Thanh lọc hiện sẵn: mỗi bộ lọc là một ô có nhãn, chọn là áp dụng ngay (đồng bộ URL); đang lọc thì tô nổi. */
export function FilterChips({ filters, values, onChange, onClear }: {
  filters: FilterDef[]; values: Record<string, string>; onChange: (key: string, v: string) => void; onClear: () => void;
}) {
  const anyActive = filters.some((f) => (f.type === "daterange" ? values[f.fromKey] || values[f.toKey] : values[f.key]));
  return (
    <div role="group" aria-label="Bộ lọc" className="flex flex-wrap items-end gap-3 xl:flex-nowrap">
      {filters.map((f) => {
        const v = values[f.key] ?? "";
        const id = `filter-${f.key}`;
        if (f.type === "daterange") {
          const from = values[f.fromKey] ?? "", to = values[f.toKey] ?? "";
          const invalid = !!from && !!to && from > to;
          const errId = `${id}-err`;
          const dateCls = "h-full w-[6.75rem] bg-transparent text-sm outline-none [color-scheme:inherit]";
          return (
            <div key={f.key} role="group" aria-labelledby={`${id}-label`} className="relative">
              <span id={`${id}-label`} className={`${toolLabel} mb-1`}>{f.label}</span>
              <div className={`${from || to ? ctlOn : ctlIdle} inline-flex items-center gap-1 !px-2 focus-within:ring-2 focus-within:ring-admin-primary/40 ${invalid ? "!border-admin-danger" : ""}`}>
                <input type="date" aria-label={`${f.label}: từ ngày`} aria-invalid={invalid || undefined} aria-describedby={invalid ? errId : undefined}
                  className={dateCls} value={from} max={to || undefined} onChange={(e) => onChange(f.fromKey, e.target.value)} />
                <span aria-hidden className="text-admin-muted">–</span>
                <input type="date" aria-label={`${f.label}: đến ngày`} aria-invalid={invalid || undefined} aria-describedby={invalid ? errId : undefined}
                  className={dateCls} value={to} min={from || undefined} onChange={(e) => onChange(f.toKey, e.target.value)} />
              </div>
              {invalid && <p id={errId} role="alert" className="absolute top-full left-0 mt-1 text-xs whitespace-nowrap text-admin-danger">Ngày bắt đầu phải trước hoặc bằng ngày kết thúc</p>}
            </div>
          );
        }
        if (f.type === "toggle") {
          return (
            <div key={f.key}>
              <span aria-hidden className={`${toolLabel} mb-1`}>&nbsp;</span>
              <label htmlFor={id} className={`${v === "1" ? ctlOn : ctlIdle} inline-flex cursor-pointer items-center gap-2`}>
                <input id={id} type="checkbox" className="size-4 accent-admin-primary" checked={v === "1"} onChange={(e) => onChange(f.key, e.target.checked ? "1" : "")} />
                {f.label}
              </label>
            </div>
          );
        }
        return (
          <div key={f.key}>
            <label htmlFor={id} className={`${toolLabel} mb-1`}>{f.label}</label>
            {f.type === "select" ? (
              <select id={id} className={`${v ? ctlOn : ctlIdle} min-w-36 pr-8 xl:max-2xl:w-40`} title={f.label} value={v} onChange={(e) => onChange(f.key, e.target.value)}>
                <option value="">Tất cả</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input id={id} type="date" className={v ? ctlOn : ctlIdle} value={v} onChange={(e) => onChange(f.key, e.target.value)} />
            )}
          </div>
        );
      })}
      {anyActive && (
        <button type="button" className={ghostBtn} title="Xóa bộ lọc" onClick={onClear}>
          <X aria-hidden className="size-4" /><span className="xl:max-2xl:sr-only">Xóa bộ lọc</span>
        </button>
      )}
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
    <Popover label="Chế độ xem" panelClass="w-72" buttonClass={current ? toolBtnOn : toolBtn}
      button={<><Bookmark aria-hidden className="size-4" />{current ? current.name : "Xem đã lưu"}</>}>
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
