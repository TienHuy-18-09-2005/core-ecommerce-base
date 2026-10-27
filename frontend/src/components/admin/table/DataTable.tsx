import { ChevronDown, ChevronRight, Columns3, Rows3 } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { SortState } from "../../../hooks/useListParams.ts";
import { EmptyState, Skeleton } from "../feedback.tsx";
import { Popover } from "./Popover.tsx";
import { toolBtn } from "./toolbarStyles.ts";
import { useDensity, useHiddenColumns } from "./useTablePrefs.ts";
import type { RowId, Selection } from "./useSelection.ts";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  /** Khóa ổn định cho ẩn/hiện cột (mặc định = header). */
  id?: string;
  className?: string;
  /** Tên trường sắp xếp phía server (whitelist backend). */
  sortKey?: string;
  /** Số/tiền: căn phải, tabular-nums. */
  align?: "right";
  /** Cột phụ: dưới 1280px chuyển vào hàng mở rộng. */
  secondary?: boolean;
  /** false = không cho ẩn (cột chính, thao tác). Mặc định cho ẩn trừ cột đầu. */
  hideable?: boolean;
}


function HeaderCheckbox({ selection, ids }: { selection: Selection; ids: RowId[] }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = selection.someSelected; }, [selection.someSelected]);
  return <input ref={ref} type="checkbox" className="size-4 accent-admin-primary" aria-label="Chọn tất cả hàng trên trang" disabled={ids.length === 0}
    checked={selection.allSelected} onChange={() => selection.toggleAll()} />;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, empty = "Không có dữ liệu.", sort, onSort, tableId, selection, rowLabel, bulkActions, toolbar, actions }: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => RowId;
  isLoading?: boolean;
  empty?: string;
  sort?: SortState | null;
  onSort?: (field: string) => void;
  /** Bật thanh công cụ (ẩn cột, mật độ) và lưu lựa chọn theo bảng. */
  tableId?: string;
  selection?: Selection;
  rowLabel?: (row: T) => string;
  /** Nút trong thanh hành động hàng loạt (hiện khi có hàng được chọn). */
  bulkActions?: ReactNode;
  /** Nội dung bên trái thanh công cụ (vd. bộ lọc). */
  toolbar?: ReactNode;
  /** Thao tác cấp bảng (vd. Xem đã lưu) — nằm bên phải cùng nhóm Cột/Mật độ. */
  actions?: ReactNode;
}) {
  const [density, setDensity] = useDensity();
  const { hidden, toggle } = useHiddenColumns(tableId);
  const [expanded, setExpanded] = useState<Set<RowId>>(new Set());
  const colId = (c: Column<T>) => c.id ?? c.header;
  const visible = columns.filter((c) => !hidden.includes(colId(c)));
  const hasSecondary = visible.some((c) => c.secondary);
  const ids = (rows ?? []).map(rowKey);
  const pad = density === "compact" ? "px-3 py-1.5" : "px-4 py-3";
  const rowH = density === "compact" ? "h-9" : "h-12";
  const colCount = visible.length + (selection ? 1 : 0) + (hasSecondary ? 1 : 0);
  const cellClass = (c: Column<T>) => `${pad} ${c.align === "right" ? "text-right tabular-nums" : ""} ${c.secondary ? "hidden xl:table-cell" : ""} ${c.className ?? ""}`;
  const toggleExpand = (id: RowId) => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="space-y-2">
      {(tableId || toolbar) && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{toolbar}</div>
          {(tableId || actions) && (
            <div role="group" aria-label="Thao tác bảng" className="ml-auto flex items-end gap-2">
              {actions}
              <Popover label="Ẩn/hiện cột" align="right" buttonClass={toolBtn} button={<><Columns3 aria-hidden className="size-4" /><span className="xl:max-2xl:sr-only">Cột</span></>}>
                {() => (
                  <fieldset>
                    <legend className="mb-2 font-semibold text-admin-fg">Hiển thị cột</legend>
                    {columns.map((c, i) => {
                      const locked = c.hideable === false || (c.hideable === undefined && i === 0);
                      return (
                        <label key={colId(c)} className="flex items-center gap-2 py-1 text-admin-fg">
                          <input type="checkbox" className="size-4 accent-admin-primary" checked={!hidden.includes(colId(c))} disabled={locked} onChange={() => toggle(colId(c))} />
                          {c.header}
                        </label>
                      );
                    })}
                  </fieldset>
                )}
              </Popover>
              <Popover label="Mật độ bảng" align="right" panelClass="w-48" buttonClass={toolBtn} button={<><Rows3 aria-hidden className="size-4" /><span className="xl:max-2xl:sr-only">{density === "compact" ? "Gọn" : "Vừa"}</span></>}>
                {(close) => (
                  <fieldset>
                    <legend className="mb-2 font-semibold text-admin-fg">Mật độ</legend>
                    {([["comfortable", "Vừa"], ["compact", "Gọn"]] as const).map(([v, l]) => (
                      <label key={v} className="flex items-center gap-2 py-1 text-admin-fg">
                        <input type="radio" name={`density-${tableId}`} className="size-4 accent-admin-primary" checked={density === v} onChange={() => { setDensity(v); close(); }} />{l}
                      </label>
                    ))}
                  </fieldset>
                )}
              </Popover>
            </div>
          )}
        </div>
      )}

      <div className="max-h-[calc(100vh-16rem)] min-h-40 overflow-auto rounded-xl border border-admin-border bg-admin-surface" data-density={density}>
        <table className="min-w-full divide-y divide-admin-border text-sm">
          <thead className="sticky top-0 z-10 bg-admin-subtle shadow-[0_1px_0_var(--color-admin-border)]">
            <tr>
              {selection && <th scope="col" className={`w-10 ${pad}`}><HeaderCheckbox selection={selection} ids={ids} /></th>}
              {hasSecondary && <th scope="col" className={`w-10 xl:hidden ${pad}`}><span className="sr-only">Mở rộng</span></th>}
              {visible.map((c) => (
                <th key={colId(c)} scope="col"
                  aria-sort={c.sortKey && onSort ? (sort?.field === c.sortKey ? (sort.direction === "asc" ? "ascending" : "descending") : "none") : undefined}
                  className={`${cellClass(c)} text-left font-semibold text-admin-fg-soft ${c.align === "right" ? "text-right!" : ""}`}>
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
                <tr key={`sk-${i}`} aria-hidden={i > 0 ? true : undefined} className={rowH}>
                  {Array.from({ length: colCount }, (_, j) => <td key={j} className={pad}>{i === 0 && j === 0 && <span className="sr-only">Đang tải...</span>}<Skeleton className={`h-4 ${j === 0 ? "w-3/4" : "w-1/2"}`} /></td>)}
                </tr>
              ))
            ) : !rows || rows.length === 0 ? (
              <tr><td colSpan={colCount}><EmptyState title={empty} /></td></tr>
            ) : (
              rows.map((row) => {
                const id = rowKey(row);
                const isSel = selection?.selected.has(id) ?? false;
                const isOpen = expanded.has(id);
                return (
                  <Fragment key={id}>
                    <tr className={`${rowH} ${isSel ? "bg-admin-primary/10" : "hover:bg-admin-subtle"}`} aria-selected={selection ? isSel : undefined}>
                      {selection && (
                        <td className={pad}>
                          <input type="checkbox" className="size-4 accent-admin-primary" checked={isSel} aria-label={`Chọn ${rowLabel ? rowLabel(row) : `hàng ${id}`}`}
                            onClick={(e) => selection.toggle(id, e.shiftKey)} onChange={() => {}} />
                        </td>
                      )}
                      {hasSecondary && (
                        <td className={`xl:hidden ${pad}`}>
                          <button type="button" className="rounded p-1 text-admin-muted hover:bg-admin-subtle" aria-expanded={isOpen} aria-label={`${isOpen ? "Thu gọn" : "Xem thêm"} ${rowLabel ? rowLabel(row) : ""}`.trim()} onClick={() => toggleExpand(id)}>
                            {isOpen ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
                          </button>
                        </td>
                      )}
                      {visible.map((c) => <td key={colId(c)} className={`align-top ${cellClass(c)}`}>{c.cell(row)}</td>)}
                    </tr>
                    {hasSecondary && isOpen && (
                      <tr className="bg-admin-subtle xl:hidden">
                        <td colSpan={colCount} className={pad}>
                          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {visible.filter((c) => c.secondary).map((c) => (
                              <div key={colId(c)}><dt className="text-xs font-medium text-admin-muted">{c.header}</dt><dd className="text-admin-fg">{c.cell(row)}</dd></div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selection && selection.count > 0 && (
        <div role="region" aria-label="Thao tác hàng loạt"
          className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-xl border border-admin-border bg-admin-surface px-4 py-2 text-sm shadow-lg">
          <span aria-live="polite" className="font-semibold text-admin-fg">Đã chọn {selection.count}</span>
          {bulkActions}
          <button type="button" className="text-admin-muted underline-offset-2 hover:underline" onClick={selection.clear}>Bỏ chọn</button>
        </div>
      )}
    </div>
  );
}
