import { btnSecondary } from "../../utils/adminFormat.ts";
import type { ReactNode } from "react";
import type { PageMeta } from "../../types/admin.ts";


import { ErrorState } from "./feedback.tsx";
export { OrderStatusBadge } from "./Badge.tsx";

export function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-admin-fg">{title}</h1>
      {actions}
    </div>
  );
}

export { DataTable, type Column } from "./table/DataTable.tsx";

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

