import { Link } from "react-router-dom";
import { btnDanger, btnSecondary, formatDateTime, inputClass } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { StarRating } from "../../components/common/StarRating.tsx";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { ReviewStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { useAdminReviewsQuery, useReviewModeration } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

export default function ReviewsPage() {
  const { values, page, set, setPage, sort, toggleSort, sortParams } = useListParams(["q", "visibility", "rating"] as const);
  const { data, error, isLoading, refetch, isRefetching } = useAdminReviewsQuery({ ...values, ...sortParams, page });
  const confirm = useConfirm();
  const { moderate, remove } = useReviewModeration();
  const toast = useToast();

  const toggle = (id: number, approved: boolean) =>
    moderate.mutate({ id, approved }, { onSuccess: () => toast.showSuccess(approved ? "Đã hiện đánh giá." : "Đã ẩn đánh giá."), onError: toast.showError });

  const onDelete = async (id: number) => {
    if (await confirm({ title: "Xóa đánh giá?", message: "Đánh giá này (kèm ảnh) sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", danger: true })) {
      remove.mutate(id, { onSuccess: () => toast.showSuccess("Đã xóa đánh giá."), onError: toast.showError });
    }
  };

  return (
    <>
      <PageHeader title="Đánh giá" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input aria-label="Tìm đánh giá" placeholder="Nội dung, sản phẩm, khách..." className={inputClass} defaultValue={values.q}
          onKeyDown={(e) => { if (e.key === "Enter") set("q", e.currentTarget.value.trim()); }}
          onBlur={(e) => set("q", e.currentTarget.value.trim())} />
        <select aria-label="Hiển thị" className={inputClass} value={values.visibility} onChange={(e) => set("visibility", e.target.value)}>
          <option value="">Tất cả</option><option value="visible">Đang hiện</option><option value="hidden">Đang ẩn</option>
        </select>
        <select aria-label="Số sao" className={inputClass} value={values.rating} onChange={(e) => set("rating", e.target.value)}>
          <option value="">Mọi số sao</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} sao</option>)}
        </select>
      </div>
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(r) => r.id} empty="Không có đánh giá phù hợp." columns={[
        { header: "Đánh giá", sortKey: "rating", cell: (r) => (
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
        { header: "Khách hàng", cell: (r) => <>{r.user?.name ?? "—"}<p className="text-xs text-admin-muted">{r.user?.email}</p>{r.verified_purchase && <p className="text-xs text-admin-success">Đã mua hàng</p>}</> },
        { header: "Ngày", sortKey: "created_at", cell: (r) => formatDateTime(r.created_at) },
        { header: "Trạng thái", sortKey: "is_approved", cell: (r) => <ReviewStatusBadge approved={r.is_approved} /> },
        { header: "Thao tác", cell: (r) => (
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
