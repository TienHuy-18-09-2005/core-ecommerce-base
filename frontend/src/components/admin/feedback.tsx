import { AlertCircle, Inbox, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { ApiError } from "../../services/apiError.ts";
import { btnSecondary } from "../../utils/adminFormat.ts";

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <span aria-hidden className={`block animate-pulse rounded bg-admin-border ${className}`} />;
}

/** Khung chờ dạng khối, có nhãn cho trình đọc màn hình. */
export function SkeletonBlock({ lines = 3, label = "Đang tải...", className = "" }: { lines?: number; label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`space-y-3 rounded-xl border border-admin-border bg-admin-surface p-5 ${className}`}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-4 ${i % 2 ? "w-2/3" : "w-full"}`} />)}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <span aria-hidden className="grid size-12 place-items-center rounded-full bg-admin-subtle text-admin-muted">{icon ?? <Inbox className="size-6" />}</span>
      <p className="font-medium text-admin-fg">{title}</p>
      {description && <p className="max-w-sm text-sm text-admin-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "Bạn không có quyền xem dữ liệu này.";
    if (error.status === 404) return "Không tìm thấy dữ liệu.";
  }
  return "Không tải được dữ liệu. Vui lòng thử lại.";
}

/** Báo lỗi tải dữ liệu, có nút "Thử lại" gọi refetch của TanStack Query. */
export function ErrorState({ error, onRetry, retrying, compact }: { error: unknown; onRetry?: () => unknown; retrying?: boolean; compact?: boolean }) {
  if (!error) return null;
  return (
    <div role="alert" className={`flex flex-wrap items-center gap-3 rounded-xl border border-admin-danger-border bg-admin-danger-subtle text-sm text-admin-danger ${compact ? "mb-4 p-3" : "mb-4 p-4"}`}>
      <AlertCircle aria-hidden className="size-5 shrink-0" />
      <p className="flex-1">{messageFor(error)}</p>
      {onRetry && (
        <button type="button" className={`${btnSecondary} inline-flex items-center gap-1.5`} disabled={retrying} onClick={() => void onRetry()}>
          <RotateCw aria-hidden className={`size-4 ${retrying ? "animate-spin" : ""}`} />{retrying ? "Đang thử lại..." : "Thử lại"}
        </button>
      )}
    </div>
  );
}
