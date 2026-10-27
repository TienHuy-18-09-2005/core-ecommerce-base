import type { AdminVariant } from "../../../types/admin.ts";

export const emptyVariant = (isDefault: boolean, name = "Mặc định"): AdminVariant => ({
  sku: "", name, price: 0, compare_at_price: null, cost_price: null,
  stock_quantity: 0, weight_grams: 0, image_url: null, is_default: isDefault, is_active: true,
});

/** Chỉ số các dòng có SKU trùng (không phân biệt hoa/thường, bỏ khoảng trắng) — khớp luật distinct:ignore_case của máy chủ. */
export function duplicateSkuRows(variants: Pick<AdminVariant, "sku">[]): Set<number> {
  const seen = new Map<string, number[]>();
  variants.forEach((v, i) => {
    const k = v.sku.trim().toLowerCase();
    if (k) seen.set(k, [...(seen.get(k) ?? []), i]);
  });
  return new Set([...seen.values()].filter((ix) => ix.length > 1).flat());
}

/** "Đỏ tươi" → "DO-TUOI" (dùng làm hậu tố SKU). */
export function skuPart(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "D")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20);
}

export interface Attribute { name: string; values: string }

/** Tách "Đỏ, Xanh, , Đỏ" → ["Đỏ","Xanh"]. */
export const splitValues = (s: string) => [...new Set(s.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean))];

/** Tích Đề-các các giá trị thuộc tính → tên biến thể "Đỏ / M". Tối đa `limit` tổ hợp. */
export function combinations(attrs: Attribute[], limit = 100): string[][] {
  const lists = attrs.map((a) => splitValues(a.values)).filter((l) => l.length > 0);
  if (!lists.length) return [];
  let out: string[][] = [[]];
  for (const l of lists) {
    out = out.flatMap((prev) => l.map((v) => [...prev, v]));
    if (out.length > limit) return out.slice(0, limit);
  }
  return out;
}

/**
 * Thêm các biến thể tổ hợp còn thiếu (so theo tên, không phân biệt hoa/thường).
 * Nếu hiện chỉ có một biến thể mặc định trống (chưa có SKU, chưa lưu) thì thay nó.
 */
export function mergeCombos(current: AdminVariant[], combos: string[][], skuPrefix: string): { variants: AdminVariant[]; added: number } {
  const blankOnly = current.length === 1 && !current[0].id && !current[0].sku.trim();
  const base = blankOnly ? [] : current;
  const names = new Set(base.map((v) => v.name.trim().toLowerCase()));
  const skus = new Set(base.map((v) => v.sku.trim().toLowerCase()));
  const tpl = current[0] ?? emptyVariant(true);
  const prefix = skuPart(skuPrefix) || "SP";
  const added: AdminVariant[] = [];
  for (const c of combos) {
    const name = c.join(" / ");
    if (names.has(name.toLowerCase())) continue;
    let sku = [prefix, ...c.map(skuPart)].filter(Boolean).join("-");
    for (let n = 2; skus.has(sku.toLowerCase()); n++) sku = `${sku.replace(/-\d+$/, "")}-${n}`;
    skus.add(sku.toLowerCase());
    names.add(name.toLowerCase());
    added.push({ ...emptyVariant(false, name), sku, price: tpl.price, compare_at_price: tpl.compare_at_price, cost_price: tpl.cost_price, weight_grams: tpl.weight_grams });
  }
  const variants = [...base, ...added];
  if (variants.length && !variants.some((v) => v.is_default)) variants[0] = { ...variants[0], is_default: true };
  return { variants, added: added.length };
}

export type BulkPriceField = "price" | "compare_at_price";
export type BulkPriceMode = "set" | "percent" | "amount";

/** Sửa giá hàng loạt trên các dòng được chọn: đặt giá, tăng/giảm %, tăng/giảm số tiền. Làm tròn tới 1.000đ khi tính %; không âm. */
export function applyBulkPrice(variants: AdminVariant[], rows: Set<number>, field: BulkPriceField, mode: BulkPriceMode, value: number): AdminVariant[] {
  return variants.map((v, i) => {
    if (!rows.has(i)) return v;
    const cur = field === "price" ? v.price : (v.compare_at_price ?? v.price);
    let next = mode === "set" ? value : mode === "percent" ? Math.round((cur * (1 + value / 100)) / 1000) * 1000 : cur + value;
    next = Math.max(0, Math.round(next));
    return field === "price" ? { ...v, price: next } : { ...v, compare_at_price: mode === "set" && value === 0 ? null : next };
  });
}
