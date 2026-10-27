import { btnSecondary } from "../../utils/adminFormat.ts";
import type { SortState } from "../../hooks/useListParams.ts";
import type { ReactNode } from "react";
import type { PageMeta } from "../../types/admin.ts";


import { EmptyState, ErrorState, Skeleton } from "./feedback.tsx";
export { OrderStatusBadge } from "./Badge.tsx";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-admin-fg">{title}</h1>
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
    <div className="overflow-x-auto rounded-xl border border-admin-border bg-admin-surface">
      <table className="min-w-full divide-y divide-admin-border text-sm">
        <thead className="bg-admin-subtle">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                scope="col"
                aria-sort={c.sortKey && onSort ? (sort?.field === c.sortKey ? (sort.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                className={`px-4 py-3 text-left font-semibold text-admin-fg-soft ${c.className ?? ""}`}
              >
                {c.sortKey && onSort ? (
                  <button type="button" onClick={() => onSort(c.sortKey as string)} className="inline-flex items-center gap-1 hover:text-admin-fg" title={`Sắp xếp theo ${c.header.toLowerCase()}`}>
                    {c.header}
                    <span aria-hidden="true" className={sort?.field === c.sortKey ? "text-admin-primary" : "text-admin-muted"}>
                      {sort?.field === c.sortKey ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-admin-border">
          {isLoading && !rows ? (
            Array.from({ length: 5 }, (_, i) => (
              <tr key={`sk-${i}`} aria-hidden={i > 0 ? true : undefined}>
                {columns.map((c, j) => <td key={c.header} className="px-4 py-3">{i === 0 && j === 0 && <span className="sr-only">Đang tải...</span>}<Skeleton className={`h-4 ${j === 0 ? "w-3/4" : "w-1/2"}`} /></td>)}
              </tr>
            ))
          ) : !rows || rows.length === 0 ? (
            <tr><td colSpan={columns.length}><EmptyState title={empty} /></td></tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-admin-subtle">
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

/** Giữ cho tương thích: dùng ErrorState (có nút "Thử lại") ở màn hình mới. */
export function QueryError({ error, onRetry, retrying }: { error: unknown; onRetry?: () => unknown; retrying?: boolean }) {
  return <ErrorState error={error} onRetry={onRetry} retrying={retrying} compact />;
}

