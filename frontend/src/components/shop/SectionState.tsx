import type { ReactNode } from "react";

interface SectionStateProps {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry?: () => void;
  emptyMessage: string;
  children: ReactNode;
}

export function SectionState({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  emptyMessage,
  children,
}: SectionStateProps) {
  if (isLoading) {
    return (
      <div aria-busy="true">
        <p className="sr-only">Đang tải</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-white p-4 text-sm text-slate-700">
        <p>Không tải được nội dung. Vui lòng thử lại.</p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white"
          >
            Thử lại
          </button>
        ) : null}
      </div>
    );
  }

  if (isEmpty) {
    return <p className="rounded-xl bg-white p-4 text-sm text-slate-600">{emptyMessage}</p>;
  }

  return children;
}
