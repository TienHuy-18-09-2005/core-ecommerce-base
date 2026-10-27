import { PAYMENT_STATUS_LABELS, formatDateTime } from "../../utils/adminFormat.ts";
import { Link } from "react-router-dom";
import { PaymentStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, OrderStatusBadge, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { FilterChips, SavedViews, SearchBox, type FilterDef } from "../../components/admin/table/FilterBar.tsx";
import { useAdminOrdersQuery } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

const KEYS = ["q", "status", "payment_status", "from", "to"] as const;
const opts = (m: Record<string, string>) => Object.entries(m).map(([value, label]) => ({ value, label }));
const FILTERS: FilterDef[] = [
  { key: "status", label: "Trạng thái đơn", type: "select", options: opts(ORDER_STATUS_LABELS) },
  { key: "payment_status", label: "Thanh toán", type: "select", options: opts(PAYMENT_STATUS_LABELS) },
  { key: "range", label: "Khoảng ngày", type: "daterange", fromKey: "from", toKey: "to" },
];
const PRESETS = [
  { name: "Đơn chờ xác nhận", query: "status=pending" },
  { name: "Đang giao", query: "status=shipping" },
  { name: "Chưa thanh toán", query: "payment_status=unpaid" },
];

// Chọn nhiều + đổi trạng thái hàng loạt cần API `POST /admin/orders/bulk-status` (trả kết quả từng đơn) — làm ở R4.
export default function OrdersPage() {
  const { values, page, set, setMany, setPage, sort, toggleSort, sortParams, query, applyQuery } = useListParams(KEYS);
  const { data, error, isLoading, refetch, isRefetching } = useAdminOrdersQuery({ ...values, ...sortParams, page });

  return (
    <>
      <PageHeader title="Đơn hàng" />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="orders" sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(o) => o.id} empty="Không có đơn phù hợp."
        rowLabel={(o) => `đơn ${o.order_code}`}
        actions={<SavedViews tableId="orders" presets={PRESETS} query={query} onApply={applyQuery} />}
        toolbar={<>
          <SearchBox label="Tìm đơn" placeholder="Mã đơn, tên, SĐT..." value={values.q} onChange={(v) => set("q", v)} />
          <FilterChips filters={FILTERS} values={values} onChange={(k, v) => set(k as (typeof KEYS)[number], v)} onClear={() => setMany({ status: "", payment_status: "", from: "", to: "" })} />
        </>}
        columns={[
          { header: "Mã đơn", sortKey: "order_code", hideable: false, cell: (o) => <Link to={`/admin/don-hang/${o.id}`} className="font-medium text-admin-primary">{o.order_code}</Link> },
          { header: "Khách hàng", sortKey: "customer_name", cell: (o) => <>{o.customer_name}<p className="text-xs text-admin-muted">{o.customer_phone}</p></> },
          { header: "Tổng tiền", sortKey: "total_amount", align: "right", cell: (o) => <>{formatCurrency(o.total_amount)}<p className="text-xs text-admin-muted">{o.items_count} sản phẩm · {o.payment_method.toUpperCase()}</p></> },
          { header: "Trạng thái", sortKey: "status", cell: (o) => <OrderStatusBadge status={o.status} /> },
          { header: "Thanh toán", secondary: true, cell: (o) => <PaymentStatusBadge status={o.payment_status} /> },
          { header: "Ngày đặt", sortKey: "created_at", secondary: true, cell: (o) => formatDateTime(o.created_at) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
