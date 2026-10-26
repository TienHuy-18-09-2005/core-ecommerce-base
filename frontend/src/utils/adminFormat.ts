import type { AdminCategory } from "../types/admin.ts";

export const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
export const btnPrimary = "rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50";
export const btnSecondary = "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
export const btnDanger = "rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

export const PRODUCT_STATUS_LABELS: Record<string, string> = { draft: "Nháp", published: "Đang bán", archived: "Lưu trữ" };
export const PAYMENT_STATUS_LABELS: Record<string, string> = { unpaid: "Chưa thanh toán", paid: "Đã thanh toán", refunded: "Đã hoàn tiền", failed: "Thất bại" };

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

/** "2026-10-26T10:00:00+07:00" → giá trị cho <input type="datetime-local">. */
export function toLocalInput(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}

/** Sắp xếp thành cây phẳng (cha trước, con thụt lề) để hiển thị. */
export function flattenTree(list: AdminCategory[]): { cat: AdminCategory; depth: number }[] {
  const byParent = new Map<number | null, AdminCategory[]>();
  for (const c of list) {
    const key = list.some((p) => p.id === c.parent_id) ? c.parent_id : null;
    byParent.set(key, [...(byParent.get(key) ?? []), c]);
  }
  const out: { cat: AdminCategory; depth: number }[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const c of (byParent.get(parent) ?? []).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "vi"))) {
      out.push({ cat: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

