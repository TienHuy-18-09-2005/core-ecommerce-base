import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, btnSecondary, formatDateTime } from "../../utils/adminFormat.ts";
import { PaymentStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, OrderStatusBadge, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { FilterChips, SavedViews, SearchBox, type FilterDef } from "../../components/admin/table/FilterBar.tsx";
import { useSelection } from "../../components/admin/table/useSelection.ts";
import { Modal } from "../../components/admin/overlay/Modal.tsx";
import { CancelReasonModal } from "../../components/admin/orders/CancelReasonModal.tsx";
import { useToast } from "../../app/useToast.ts";
import { useAdminOrdersQuery, useBulkOrderStatusMutation, useOrderStatusCountsQuery } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import type { BulkStatusResult } from "../../types/admin.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";


const KEYS = ["q", "status", "payment_method", "payment_status", "from", "to"] as const;
const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));
const FILTERS: FilterDef[] = [
  { key: "payment_method", label: "Phương thức", type: "select", options: opts(PAYMENT_METHOD_LABELS) },
  { key: "payment_status", label: "Thanh toán", type: "select", options: opts(PAYMENT_STATUS_LABELS) },
  { key: "range", label: "Khoảng ngày", type: "daterange", fromKey: "from", toKey: "to" },
];
const PRESETS = [
  { name: "Đơn chờ xác nhận", query: "status=pending" },
  { name: "COD chưa thu tiền", query: "payment_method=cod&payment_status=unpaid" },
  { name: "Chưa thanh toán", query: "payment_status=unpaid" },
];
const TABS = ["", "pending", "confirmed", "packing", "shipping", "delivered", "cancelled", "returned"];
const BULK = [
  { status: "confirmed", label: "Xác nhận" },
  { status: "packing", label: "Chuyển đóng gói" },
  { status: "shipping", label: "Đang giao" },
];

export default function OrdersPage() {
  const { values, page, set, setMany, setPage, sort, toggleSort, sortParams, query, applyQuery } = useListParams(KEYS);
  const { data, error, isLoading, refetch, isRefetching } = useAdminOrdersQuery({ ...values, ...sortParams, page });
  const { status: _s, ...countFilters } = values;
  void _s;
  const counts = useOrderStatusCountsQuery(countFilters).data;
  const selection = useSelection((data?.data ?? []).map((o) => o.id), `${query}|${page}`);
  const bulk = useBulkOrderStatusMutation();
  const toast = useToast();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [report, setReport] = useState<{ label: string; result: BulkStatusResult } | null>(null);

  const run = (status: string, label: string, cancel_reason?: string) => {
    bulk.mutate({ ids: selection.ids as number[], status, cancel_reason }, {
      onSuccess: (r) => {
        setCancelOpen(false);
        selection.clear();
        if (r.failed === 0) toast.showSuccess(`${label}: đã cập nhật ${r.succeeded} đơn.`);
        else setReport({ label, result: r });
      },
      onError: (e) => { if (!firstFieldErrors(e).cancel_reason) toast.showError(e); },
    });
  };

  return (
    <>
      <PageHeader title="Đơn hàng" />
      <nav aria-label="Lọc theo trạng thái" className="mb-3 flex flex-wrap gap-x-0.5 border-b border-admin-border">
        {TABS.map((st) => {
          const active = (values.status ?? "") === st;
          const n = counts?.[st === "" ? "all" : st];
          return (
            <button key={st || "all"} type="button" aria-pressed={active} onClick={() => set("status", st)}
              className={`-mb-px inline-flex shrink-0 items-center gap-1 whitespace-nowrap border-b-2 px-1.5 py-2 text-sm xl:gap-1.5 xl:px-3 ${active ? "border-admin-primary font-semibold text-admin-primary" : "border-transparent text-admin-fg-soft hover:text-admin-fg"}`}>
              {st === "" ? "Tất cả" : ORDER_STATUS_LABELS[st]}
              {n !== undefined && <span className={`rounded-full px-1.5 text-xs leading-5 ${active ? "bg-admin-primary text-admin-on-primary" : st === "pending" && n > 0 ? "bg-admin-warning-subtle text-admin-fg" : "bg-admin-subtle text-admin-muted"}`}>{n}</span>}
            </button>
          );
        })}
      </nav>
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="orders" sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(o) => o.id} empty="Không có đơn phù hợp."
        selection={selection} rowLabel={(o) => `đơn ${o.order_code}`}
        bulkActions={<>
          {BULK.map((b) => (
            <button key={b.status} type="button" className={btnSecondary} disabled={bulk.isPending} onClick={() => run(b.status, b.label)}>{b.label}</button>
          ))}
          <button type="button" className={btnSecondary} onClick={() => navigate(`/admin/don-hang/in?ids=${(selection.ids as number[]).join(",")}`)}>In phiếu</button>
          <button type="button" className="rounded-lg border border-admin-danger-border bg-admin-surface px-4 py-2 text-sm font-medium text-admin-danger hover:bg-admin-danger-subtle disabled:opacity-50"
            disabled={bulk.isPending} onClick={() => setCancelOpen(true)}>Hủy đơn</button>
        </>}
        actions={<SavedViews tableId="orders" presets={PRESETS} query={query} onApply={applyQuery} />}
        toolbar={<>
          <SearchBox label="Tìm đơn" placeholder="Mã đơn, tên, SĐT..." value={values.q} onChange={(v) => set("q", v)} />
          <FilterChips filters={FILTERS} values={values} onChange={(k, v) => set(k as (typeof KEYS)[number], v)} onClear={() => setMany({ payment_method: "", payment_status: "", from: "", to: "" })} />
        </>}
        columns={[
          { header: "Mã đơn", sortKey: "order_code", hideable: false, cell: (o) => <Link to={`/admin/don-hang/${o.id}`} className="font-medium text-admin-primary">{o.order_code}</Link> },
          { header: "Khách hàng", sortKey: "customer_name", cell: (o) => <>{o.customer_name}<p className="text-xs text-admin-muted">{o.customer_phone}</p></> },
          { header: "Tổng tiền", sortKey: "total_amount", align: "right", cell: (o) => <>{formatCurrency(o.total_amount)}<p className="text-xs text-admin-muted">{o.items_count} sản phẩm · {PAYMENT_METHOD_LABELS[o.payment_method] ?? o.payment_method.toUpperCase()}</p></> },
          { header: "Trạng thái", sortKey: "status", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { header: "Thanh toán", secondary: true, cell: (o) => <PaymentStatusBadge status={o.payment_status} /> },
          { header: "Ngày đặt", sortKey: "created_at", secondary: true, cell: (o) => formatDateTime(o.created_at) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      <CancelReasonModal open={cancelOpen} count={selection.count} pending={bulk.isPending} onClose={() => setCancelOpen(false)}
        serverError={firstFieldErrors(bulk.error).cancel_reason} onSubmit={(reason) => run("cancelled", "Hủy đơn", reason)} />
      <Modal open={report !== null} onClose={() => setReport(null)} title="Kết quả cập nhật hàng loạt"
        footer={<button type="button" className={btnSecondary} onClick={() => setReport(null)}>Đóng</button>}>
        {report && <>
          <p className="mb-3">{report.label}: <strong className="text-admin-success">{report.result.succeeded} thành công</strong>, <strong className="text-admin-danger">{report.result.failed} không thực hiện được</strong>.</p>
          <ul className="space-y-1">
            {report.result.results.filter((r) => !r.ok).map((r) => (
              <li key={r.id} className="rounded bg-admin-danger-subtle px-3 py-2"><span className="font-medium">{r.order_code ?? `#${r.id}`}</span>: {r.message}</li>
            ))}
          </ul>
        </>}
      </Modal>
    </>
  );
}
