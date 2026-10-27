import { useId, useState } from "react";
import { btnSecondary, inputClass } from "../../../utils/adminFormat.ts";
import { Popover } from "../../../components/admin/table/Popover.tsx";
import type { AdminVariant } from "../../../types/admin.ts";
import { applyBulkPrice, combinations, emptyVariant, mergeCombos, type Attribute, type BulkPriceField, type BulkPriceMode } from "./variantUtils.ts";

const cell = `${inputClass} !px-2 !py-1.5 text-sm`;
const num = (s: string) => (s === "" ? null : Number(s));
const iconBtn = "rounded px-1.5 py-1 text-sm text-admin-fg-soft hover:bg-admin-subtle disabled:opacity-40";

/** Bảng biến thể sửa trực tiếp: thêm/bỏ/nhân đôi dòng, tạo tổ hợp từ thuộc tính, sửa giá hàng loạt. */
export function VariantsTable({ variants, onChange, errors, dupRows, productName }: {
  variants: AdminVariant[]; onChange: (v: AdminVariant[]) => void; errors: Record<string, string | undefined>;
  dupRows: Set<number>; productName: string;
}) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");
  const uid = useId();
  const patch = (i: number, p: Partial<AdminVariant>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...p } : p.is_default ? { ...v, is_default: false } : v)));
  const remove = (i: number) => {
    const next = variants.filter((_, j) => j !== i);
    if (variants[i].is_default && next.length) next[0] = { ...next[0], is_default: true };
    onChange(next);
    setPicked(new Set());
  };
  const duplicate = (i: number) => {
    const src = variants[i];
    const copy: AdminVariant = { ...src, id: undefined, sku: src.sku ? `${src.sku}-2` : "", name: `${src.name} (bản sao)`, is_default: false, stock_quantity: 0 };
    onChange([...variants.slice(0, i + 1), copy, ...variants.slice(i + 1)]);
    setPicked(new Set());
  };
  const all = picked.size === variants.length && variants.length > 0;
  const togglePick = (i: number) => setPicked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const err = (i: number, f: string) => errors[`variants.${i}.${f}`];
  const total = variants.reduce((s, v) => s + (Number(v.stock_quantity) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={btnSecondary} onClick={() => onChange([...variants, emptyVariant(variants.length === 0, "")])}>+ Thêm biến thể</button>
        <CombosPopover onApply={(attrs) => {
          const r = mergeCombos(variants, combinations(attrs), productName);
          onChange(r.variants);
          setPicked(new Set());
          setNotice(r.added ? `Đã thêm ${r.added} biến thể. Kiểm tra lại SKU và giá trước khi lưu.` : "Không có tổ hợp mới — các tên biến thể đã tồn tại.");
        }} />
        <BulkPricePopover count={picked.size || variants.length} onApply={(field, mode, value) => {
          const rows = picked.size ? picked : new Set(variants.map((_, i) => i));
          onChange(applyBulkPrice(variants, rows, field, mode, value));
          setNotice(`Đã sửa giá ${rows.size} biến thể.`);
        }} />
        <span className="ml-auto text-sm text-admin-muted">{variants.length} biến thể · tổng tồn {total}</span>
      </div>
      <p role="status" className="text-sm text-admin-success empty:hidden">{notice}</p>
      {errors.variants && <p role="alert" className="text-sm text-admin-danger">{errors.variants}</p>}
      {dupRows.size > 0 && <p role="alert" className="text-sm text-admin-danger">Có SKU bị trùng trong danh sách (không phân biệt hoa/thường). Mỗi biến thể cần một SKU riêng.</p>}

      <div className="overflow-x-auto rounded-lg border border-admin-border">
        <table className="w-full min-w-[60rem] text-sm">
          <caption className="sr-only">Danh sách biến thể</caption>
          <thead className="bg-admin-subtle text-left text-xs font-medium text-admin-muted">
            <tr>
              <th scope="col" className="w-8 px-2 py-2"><input type="checkbox" aria-label="Chọn tất cả biến thể" checked={all} onChange={() => setPicked(all ? new Set() : new Set(variants.map((_, i) => i)))} /></th>
              <th scope="col" className="min-w-40 px-2 py-2">Tên biến thể *</th>
              <th scope="col" className="min-w-44 px-2 py-2">SKU *</th>
              <th scope="col" className="px-2 py-2 text-right">Giá bán *</th>
              <th scope="col" className="px-2 py-2 text-right">Giá gốc</th>
              <th scope="col" className="px-2 py-2 text-right">Giá vốn</th>
              <th scope="col" className="px-2 py-2 text-right">Tồn</th>
              <th scope="col" className="px-2 py-2 text-right">KL (g)</th>
              <th scope="col" className="px-2 py-2 text-center">Mặc định</th>
              <th scope="col" className="px-2 py-2 text-center">Đang bán</th>
              <th scope="col" className="px-2 py-2"><span className="sr-only">Thao tác</span></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v, i) => {
              const n = i + 1;
              const skuErr = err(i, "sku") ?? (dupRows.has(i) ? "SKU bị trùng." : undefined);
              const field = (f: keyof AdminVariant, label: string, value: string | number, set: (s: string) => void, type = "number", e = err(i, f)) => (
                <td className={`px-1.5 py-1.5 align-top ${type === "number" ? "w-28" : ""}`}>
                  <input type={type} title={type === "text" && value ? String(value) : undefined} min={type === "number" ? 0 : undefined} inputMode={type === "number" ? "numeric" : undefined}
                    aria-label={`${label} biến thể ${n}`} aria-invalid={e ? true : undefined} aria-describedby={e ? `${uid}-${i}-${f}` : undefined}
                    className={`${cell} ${type === "number" ? "text-right" : "truncate"} ${e ? "!border-admin-danger" : ""}`} value={value} onChange={(ev) => set(ev.target.value)} />
                  {e && <p id={`${uid}-${i}-${f}`} className="mt-0.5 text-xs text-admin-danger">{e}</p>}
                </td>
              );
              return (
                <tr key={v.id ?? `new-${i}`} className={`border-t border-admin-border ${picked.has(i) ? "bg-admin-primary-subtle/40" : ""}`}>
                  <td className="px-2 py-1.5 align-top"><input type="checkbox" className="mt-2" aria-label={`Chọn biến thể ${n}`} checked={picked.has(i)} onChange={() => togglePick(i)} /></td>
                  {field("name", "Tên", v.name, (s) => patch(i, { name: s }), "text")}
                  {field("sku", "SKU", v.sku, (s) => patch(i, { sku: s }), "text", skuErr)}
                  {field("price", "Giá bán", v.price, (s) => patch(i, { price: Number(s) }))}
                  {field("compare_at_price", "Giá gốc", v.compare_at_price ?? "", (s) => patch(i, { compare_at_price: num(s) }))}
                  {field("cost_price", "Giá vốn", v.cost_price ?? "", (s) => patch(i, { cost_price: num(s) }))}
                  {field("stock_quantity", "Tồn kho", v.stock_quantity, (s) => patch(i, { stock_quantity: Number(s) }))}
                  {field("weight_grams", "Khối lượng", v.weight_grams, (s) => patch(i, { weight_grams: Number(s) }))}
                  <td className="px-2 py-1.5 text-center align-top"><input type="radio" className="mt-2" name={`${uid}-default`} aria-label={`Biến thể ${n} là mặc định`} checked={v.is_default} onChange={() => patch(i, { is_default: true })} /></td>
                  <td className="px-2 py-1.5 text-center align-top"><input type="checkbox" className="mt-2" aria-label={`Biến thể ${n} đang bán`} checked={v.is_active} onChange={(e) => patch(i, { is_active: e.target.checked })} /></td>
                  <td className="whitespace-nowrap px-1 py-1.5 align-top">
                    <button type="button" className={iconBtn} title="Nhân đôi" aria-label={`Nhân đôi biến thể ${n}`} onClick={() => duplicate(i)}>⧉</button>
                    <button type="button" className={`${iconBtn} hover:!text-admin-danger`} title="Bỏ" aria-label={`Bỏ biến thể ${n}`} disabled={variants.length <= 1} onClick={() => remove(i)}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-admin-muted">Biến thể bị bỏ sẽ ẩn khỏi shop khi lưu; đơn hàng cũ vẫn giữ thông tin. Có thể hoán đổi SKU giữa các biến thể trong một lần lưu.</p>
    </div>
  );
}

function CombosPopover({ onApply }: { onApply: (attrs: Attribute[]) => void }) {
  const [attrs, setAttrs] = useState<Attribute[]>([{ name: "Màu", values: "" }, { name: "Kích thước", values: "" }]);
  const count = combinations(attrs).length;
  return (
    <Popover label="Tạo tổ hợp từ thuộc tính" button="Tạo tổ hợp từ thuộc tính" buttonClass={btnSecondary} panelClass="w-96">
      {(close) => (
        <div className="space-y-2">
          <p className="text-xs text-admin-muted">Mỗi thuộc tính một dòng; các giá trị cách nhau bằng dấu phẩy. Tổ hợp đã có (trùng tên) sẽ được bỏ qua.</p>
          {attrs.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label={`Tên thuộc tính ${i + 1}`} className={`${cell} w-28`} value={a.name} onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input aria-label={`Giá trị thuộc tính ${i + 1}`} placeholder="Đỏ, Xanh, Trắng" className={cell} value={a.values} onChange={(e) => setAttrs(attrs.map((x, j) => (j === i ? { ...x, values: e.target.value } : x)))} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button type="button" className="text-sm text-admin-primary disabled:opacity-40" disabled={attrs.length >= 3} onClick={() => setAttrs([...attrs, { name: "", values: "" }])}>+ Thuộc tính</button>
            <button type="button" className={btnSecondary} disabled={!count} onClick={() => { onApply(attrs); close(); }}>Tạo {count} tổ hợp</button>
          </div>
        </div>
      )}
    </Popover>
  );
}

function BulkPricePopover({ count, onApply }: { count: number; onApply: (f: BulkPriceField, m: BulkPriceMode, v: number) => void }) {
  const [field, setField] = useState<BulkPriceField>("price");
  const [mode, setMode] = useState<BulkPriceMode>("percent");
  const [value, setValue] = useState("");
  return (
    <Popover label="Sửa giá hàng loạt" button="Sửa giá hàng loạt" buttonClass={btnSecondary} panelClass="w-80">
      {(close) => (
        <div className="space-y-2">
          <p className="text-xs text-admin-muted">Áp dụng cho {count} biến thể (đã chọn, hoặc tất cả nếu chưa chọn dòng nào).</p>
          <label className="block text-sm">Giá cần sửa
            <select className={cell} value={field} onChange={(e) => setField(e.target.value as BulkPriceField)}>
              <option value="price">Giá bán</option><option value="compare_at_price">Giá gốc</option>
            </select>
          </label>
          <label className="block text-sm">Cách sửa
            <select className={cell} value={mode} onChange={(e) => setMode(e.target.value as BulkPriceMode)}>
              <option value="percent">Tăng/giảm theo % (vd. -10)</option><option value="amount">Tăng/giảm số tiền (vd. 20000)</option><option value="set">Đặt bằng giá</option>
            </select>
          </label>
          <label className="block text-sm">Giá trị
            <input type="number" className={cell} value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <div className="flex justify-end"><button type="button" className={btnSecondary} disabled={value === "" || Number.isNaN(Number(value))} onClick={() => { onApply(field, mode, Number(value)); close(); }}>Áp dụng</button></div>
        </div>
      )}
    </Popover>
  );
}
