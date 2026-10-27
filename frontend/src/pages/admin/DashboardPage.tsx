import { formatDateTime } from "../../utils/adminFormat.ts";
import { Link } from "react-router-dom";
import { Skeleton } from "../../components/admin/feedback.tsx";
import { DataTable, OrderStatusBadge, PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useDashboardQuery } from "../../hooks/useAdminQuery.ts";
import { useCan } from "../../hooks/useCan.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

function Stat({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const body = (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-4">
      <p className="text-sm text-admin-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-admin-fg">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  const { data, error, isLoading, refetch, isRefetching } = useDashboardQuery();
  const can = useCan();
  const max = Math.max(1, ...(data?.revenue_series.map((d) => d.revenue ?? 0) ?? [1]));
  // Server bỏ hẳn trường doanh thu khi thiếu quyền revenue.view.
  const showRevenue = data?.stats.revenue_today !== undefined;

  return (
    <>
      <PageHeader title="Tổng quan" />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      {isLoading && (
        <div role="status" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <span className="sr-only">Đang tải...</span>
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-4"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-7 w-2/3" /></div>)}
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {showRevenue && <Stat label="Doanh thu hôm nay" value={formatCurrency(data.stats.revenue_today ?? 0)} />}
            <Stat label="Đơn hôm nay" value={data.stats.orders_today} />
            <Stat label="Đơn chờ xác nhận" value={data.stats.pending_orders} to="/admin/don-hang?status=pending" />
            {showRevenue && <Stat label="Doanh thu 14 ngày" value={formatCurrency(data.stats.revenue_14d ?? 0)} />}
            <Stat label="Tổng số đơn" value={data.stats.orders_total} />
            <Stat label="Biến thể sắp hết hàng" value={data.stats.low_stock_variants} />
            <Stat label="Đánh giá đang ẩn" value={data.stats.hidden_reviews} to="/admin/danh-gia?visibility=hidden" />
          </div>

          {showRevenue && <section className="rounded-xl border border-admin-border bg-admin-surface p-4">
            <h2 className="mb-4 font-semibold">Doanh thu 14 ngày (không tính đơn hủy/trả)</h2>
            <ol className="flex h-48 items-end gap-1" aria-label="Biểu đồ doanh thu">
              {data.revenue_series.map((d) => (
                <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${formatCurrency(d.revenue ?? 0)} · ${d.orders} đơn`}>
                  <div className="w-full rounded-t bg-admin-primary" style={{ height: `${((d.revenue ?? 0) / max) * 100}%`, minHeight: (d.revenue ?? 0) > 0 ? 2 : 0 }} />
                  <span className="text-[10px] text-admin-muted">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
                </li>
              ))}
            </ol>
          </section>}

          <div className="grid gap-6 lg:grid-cols-2">
            {can("orders.view") && <section>
              <h2 className="mb-2 font-semibold">Đơn hàng gần đây</h2>
              <DataTable rows={data.recent_orders} rowKey={(o) => o.id} columns={[
                { header: "Mã đơn", cell: (o) => <Link className="font-medium text-admin-primary" to={`/admin/don-hang/${o.id}`}>{o.order_code}</Link> },
                { header: "Khách", cell: (o) => o.customer_name },
                { header: "Tổng", cell: (o) => formatCurrency(o.total_amount) },
                { header: "Trạng thái", cell: (o) => <OrderStatusBadge status={o.status} /> },
                { header: "Lúc", cell: (o) => formatDateTime(o.created_at) },
              ]} />
            </section>}
            {can("products.view") && <section>
              <h2 className="mb-2 font-semibold">Sắp hết hàng</h2>
              <DataTable rows={data.low_stock} rowKey={(v) => v.variant_id} empty="Không có biến thể nào sắp hết." columns={[
                { header: "Sản phẩm", cell: (v) => <Link className="text-admin-primary" to={`/admin/san-pham?sua=${v.product_id}`}>{v.product_name ?? "—"}</Link> },
                { header: "Biến thể", cell: (v) => `${v.variant_name} (${v.sku})` },
                { header: "Tồn", cell: (v) => <span className="font-semibold text-admin-danger">{v.stock_quantity}</span> },
              ]} />
            </section>}
          </div>
        </div>
      )}
    </>
  );
}
