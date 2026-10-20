interface Props {
  page: number;
  lastPage: number;
  onPage: (page: number) => void;
}

function pageList(page: number, last: number): (number | "…")[] {
  const pages = new Set([1, last, page - 1, page, page + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, lastPage, onPage }: Props) {
  if (lastPage <= 1) return null;
  return (
    <nav aria-label="Phân trang" className="mt-6 flex justify-center">
      <ul className="flex items-center gap-1">
        <li>
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded px-3 py-1 text-sm disabled:opacity-40" aria-label="Trang trước">◀</button>
        </li>
        {pageList(page, lastPage).map((p, i) => (
          <li key={`${p}-${i}`}>
            {p === "…" ? (
              <span className="px-2 text-slate-500">…</span>
            ) : (
              <button
                type="button"
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPage(p)}
                className={`rounded px-3 py-1 text-sm ${p === page ? "bg-blue-600 font-semibold text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                {p}
              </button>
            )}
          </li>
        ))}
        <li>
          <button type="button" disabled={page >= lastPage} onClick={() => onPage(page + 1)} className="rounded px-3 py-1 text-sm disabled:opacity-40" aria-label="Trang sau">▶</button>
        </li>
      </ul>
    </nav>
  );
}
