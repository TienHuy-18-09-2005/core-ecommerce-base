import { btnSecondary } from "../../utils/adminFormat.ts";
import type { ReactNode } from "react";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import type { PageMeta } from "../../types/admin.ts";


const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  packing: "bg-indigo-100 text-indigo-800",
  shipping: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-slate-200 text-slate-700",
};
import type { SortState } from "../../hooks/useListParams.ts";

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700"}`}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {actions}
    </div>
  );
}

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Tên trường sắp xếp phía server (whitelist backend). */
  sortKey?: string;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, empty = "Không có dữ liệu.", sort, onSort }: {
  sort?: SortState | null;
  onSort?: (field: string) => void;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                aria-sort={c.sortKey && onSort ? (sort?.field === c.sortKey ? (sort.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                className={`px-4 py-3 text-left font-semibold text-slate-600 ${c.className ?? ""}`}
              >
                {c.sortKey && onSort ? (
                  <button type="button" onClick={() => onSort(c.sortKey as string)} className="inline-flex items-center gap-1 hover:text-slate-900" title={`Sắp xếp theo ${c.header.toLowerCase()}`}>
                    {c.header}
                    <span aria-hidden="true" className={sort?.field === c.sortKey ? "text-blue-700" : "text-slate-300"}>
                      {sort?.field === c.sortKey ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && !rows ? (
            <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">Đang tải...</td></tr>
          ) : !rows || rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-slate-500">{empty}</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-slate-50">
                {columns.map((c) => <td key={c.header} className={`px-4 py-3 align-top ${c.className ?? ""}`}>{c.cell(row)}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ meta, onPage }: { meta: PageMeta | undefined; onPage: (page: number) => void }) {
  if (!meta || meta.last_page <= 1) {
    return null;
  }
  return (
    <nav aria-label="Phân trang" className="mt-4 flex items-center justify-end gap-2 text-sm">
      <button type="button" className={btnSecondary} disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>Trước</button>
      <span>Trang {meta.current_page}/{meta.last_page} · {meta.total} mục</span>
      <button type="button" className={btnSecondary} disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>Sau</button>
    </nav>
  );
}

export function QueryError({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }
  return <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Không tải được dữ liệu. Vui lòng thử lại.</p>;
}

