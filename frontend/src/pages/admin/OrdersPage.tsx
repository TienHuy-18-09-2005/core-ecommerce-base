import { PAYMENT_STATUS_LABELS, formatDateTime, inputClass } from "../../utils/adminFormat.ts";
import { Link } from "react-router-dom";
import { PaymentStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, OrderStatusBadge, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { useAdminOrdersQuery } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

export default function OrdersPage() {
  const { values, page, set, setPage, sort, toggleSort, sortParams } = useListParams(["q", "status", "payment_status", "from", "to"] as const);
  const { data, error, isLoading, refetch, isRefetching } = useAdminOrdersQuery({ ...values, ...sortParams, page });

  return (
    <>
      <PageHeader title="Đơn hàng" />
      <div className="mb-4 grid gap-3 sm:grid-cols-5">
        <input aria-label="Tìm đơn" placeholder="Mã đơn, tên, SĐT..." className={inputClass} defaultValue={values.q}
          onKeyDown={(e) => { if (e.key === "Enter") set("q", e.currentTarget.value.trim()); }}
          onBlur={(e) => set("q", e.currentTarget.value.trim())} />
        <select aria-label="Trạng thái đơn" className={inputClass} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Thanh toán" className={inputClass} value={values.payment_status} onChange={(e) => set("payment_status", e.target.value)}>
          <option value="">Mọi thanh toán</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" aria-label="Từ ngày" className={inputClass} value={values.from} onChange={(e) => set("from", e.target.value)} />
        <input type="date" aria-label="Đến ngày" className={inputClass} value={values.to} onChange={(e) => set("to", e.target.value)} />
      </div>
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(o) => o.id} empty="Không có đơn phù hợp." columns={[
        { header: "Mã đơn", sortKey: "order_code", cell: (o) => <Link to={`/admin/don-hang/${o.id}`} className="font-medium text-admin-primary">{o.order_code}</Link> },
        { header: "Khách hàng", sortKey: "customer_name", cell: (o) => <>{o.customer_name}<p className="text-xs text-admin-muted">{o.customer_phone}</p></> },
        { header: "Tổng tiền", sortKey: "total_amount", cell: (o) => <>{formatCurrency(o.total_amount)}<p className="text-xs text-admin-muted">{o.items_count} sản phẩm · {o.payment_method.toUpperCase()}</p></> },
        { header: "Trạng thái", sortKey: "status", cell: (o) => <OrderStatusBadge status={o.status} /> },
        { header: "Thanh toán", cell: (o) => <PaymentStatusBadge status={o.payment_status} /> },
        { header: "Ngày đặt", sortKey: "created_at", cell: (o) => formatDateTime(o.created_at) },
      ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
