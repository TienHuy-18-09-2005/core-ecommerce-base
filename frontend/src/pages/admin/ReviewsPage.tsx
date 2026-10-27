import { Link } from "react-router-dom";
import { btnDanger, btnSecondary, formatDateTime } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { StarRating } from "../../components/common/StarRating.tsx";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { ReviewStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { useAdminReviewsQuery, useBulkAction, useBulkActionWith, useReviewModeration } from "../../hooks/useAdminQuery.ts";
import { FilterChips, SavedViews, SearchBox, type FilterDef } from "../../components/admin/table/FilterBar.tsx";
import { useSelection } from "../../components/admin/table/useSelection.ts";
import { bulkMessage } from "../../components/admin/table/bulkMessage.ts";
import { adminService } from "../../services/adminService.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

const KEYS = ["q", "visibility", "rating"] as const;
const FILTERS: FilterDef[] = [
  { key: "visibility", label: "Hiển thị", type: "select", options: [{ value: "visible", label: "Đang hiện" }, { value: "hidden", label: "Đang ẩn" }] },
  { key: "rating", label: "Số sao", type: "select", options: [5, 4, 3, 2, 1].map((r) => ({ value: String(r), label: `${r} sao` })) },
];
const PRESETS = [
  { name: "Đang ẩn", query: "visibility=hidden" },
  { name: "Đánh giá 1 sao", query: "rating=1" },
];

export default function ReviewsPage() {
  const { values, page, set, setMany, setPage, sort, toggleSort, sortParams, query, applyQuery } = useListParams(KEYS);
  const { data, error, isLoading, refetch, isRefetching } = useAdminReviewsQuery({ ...values, ...sortParams, page });
  const confirm = useConfirm();
  const { moderate, remove } = useReviewModeration();
  const toast = useToast();
  const selection = useSelection((data?.data ?? []).map((r) => r.id), `${query}|${page}`);
  const bulkModerate = useBulkActionWith((id: number, approved: boolean) => adminService.moderateReview(id, approved));
  const bulkDelete = useBulkAction((id: number) => adminService.deleteReview(id));

  const toggle = (id: number, approved: boolean) =>
    moderate.mutate({ id, approved }, { onSuccess: () => toast.showSuccess(approved ? "Đã hiện đánh giá." : "Đã ẩn đánh giá."), onError: toast.showError });

  const onDelete = async (id: number) => {
    if (await confirm({ title: "Xóa đánh giá?", message: "Đánh giá này (kèm ảnh) sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", danger: true })) {
      remove.mutate(id, { onSuccess: () => toast.showSuccess("Đã xóa đánh giá."), onError: toast.showError });
    }
  };

  const onBulkModerate = (approved: boolean) =>
    bulkModerate.mutate({ ids: selection.ids as number[], approved }, {
      onSuccess: (r) => { (r.failed ? toast.showError : toast.showSuccess)(bulkMessage(r, approved ? "Đã hiện" : "Đã ẩn", "đánh giá")); selection.clear(); },
    });
  const onBulkDelete = async () => {
    const ids = selection.ids as number[];
    if (!(await confirm({ title: `Xóa ${ids.length} đánh giá?`, message: "Các đánh giá đã chọn (kèm ảnh) sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", danger: true }))) return;
    bulkDelete.mutate(ids, { onSuccess: (r) => { (r.failed ? toast.showError : toast.showSuccess)(bulkMessage(r, "Đã xóa", "đánh giá")); selection.clear(); } });
  };
  const busy = bulkModerate.isPending || bulkDelete.isPending;

  return (
    <>
      <PageHeader title="Đánh giá" />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="reviews" selection={selection} rowLabel={(r) => `đánh giá ${r.id} của ${r.user?.name ?? "khách"}`}
        toolbar={<>
          <SearchBox label="Tìm đánh giá" placeholder="Nội dung, sản phẩm, khách..." value={values.q} onChange={(v) => set("q", v)} />
          <FilterChips filters={FILTERS} values={values} onChange={(k, v) => set(k as (typeof KEYS)[number], v)} onClear={() => setMany({ visibility: "", rating: "" })} />
          <SavedViews tableId="reviews" presets={PRESETS} query={query} onApply={applyQuery} />
        </>}
        bulkActions={<>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => onBulkModerate(false)}>Ẩn</button>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => onBulkModerate(true)}>Hiện</button>
          <button type="button" className={btnDanger} disabled={busy} onClick={() => void onBulkDelete()}>Xóa</button>
        </>}
        sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(r) => r.id} empty="Không có đánh giá phù hợp." columns={[
        { header: "Đánh giá", sortKey: "rating", hideable: false, cell: (r) => (
          <div className="max-w-md">
            <StarRating value={r.rating} size="sm" />
            {/* Văn bản thuần — render qua text node */}
            <p className="mt-1 whitespace-pre-line text-admin-fg-soft">{r.comment || <em className="text-admin-muted">(không có nội dung)</em>}</p>
            {r.images.length > 0 && (
              <div className="mt-2 flex gap-2">
                {r.images.map((src) => {
                  const url = safeImageUrl(src);
                  return url ? <a key={src} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh đánh giá" loading="lazy" decoding="async" width={56} height={56} className="h-14 w-14 rounded object-cover" /></a> : null;
                })}
              </div>
            )}
          </div>
        ) },
        { header: "Sản phẩm", cell: (r) => (r.product ? <Link to={`/admin/san-pham/${r.product.id}`} className="text-admin-primary">{r.product.name}</Link> : "—") },
        { header: "Khách hàng", secondary: true, cell: (r) => <>{r.user?.name ?? "—"}<p className="text-xs text-admin-muted">{r.user?.email}</p>{r.verified_purchase && <p className="text-xs text-admin-success">Đã mua hàng</p>}</> },
        { header: "Ngày", secondary: true, sortKey: "created_at", cell: (r) => formatDateTime(r.created_at) },
        { header: "Trạng thái", sortKey: "is_approved", cell: (r) => <ReviewStatusBadge approved={r.is_approved} /> },
        { header: "Thao tác", hideable: false, cell: (r) => (
          <div className="flex flex-col gap-2">
            <button type="button" className={btnSecondary} disabled={moderate.isPending} onClick={() => toggle(r.id, !r.is_approved)}>{r.is_approved ? "Ẩn" : "Hiện"}</button>
            <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => void onDelete(r.id)}>Xóa</button>
          </div>
        ) },
      ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
