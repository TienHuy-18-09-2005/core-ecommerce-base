import { formatDateTime } from "../../utils/adminFormat.ts";
import { Link } from "react-router-dom";
import { DataTable, OrderStatusBadge, PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useDashboardQuery } from "../../hooks/useAdminQuery.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

function Stat({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function DashboardPage() {
  const { data, error, isLoading } = useDashboardQuery();
  const max = Math.max(1, ...(data?.revenue_series.map((d) => d.revenue) ?? [1]));

  return (
    <>
      <PageHeader title="Tổng quan" />
      <QueryError error={error} />
      {isLoading && <p>Đang tải...</p>}
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Doanh thu hôm nay" value={formatCurrency(data.stats.revenue_today)} />
            <Stat label="Đơn hôm nay" value={data.stats.orders_today} />
            <Stat label="Đơn chờ xác nhận" value={data.stats.pending_orders} to="/admin/don-hang?status=pending" />
            <Stat label="Doanh thu 14 ngày" value={formatCurrency(data.stats.revenue_14d)} />
            <Stat label="Tổng số đơn" value={data.stats.orders_total} />
            <Stat label="Biến thể sắp hết hàng" value={data.stats.low_stock_variants} />
            <Stat label="Đánh giá đang ẩn" value={data.stats.hidden_reviews} to="/admin/danh-gia?visibility=hidden" />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-semibold">Doanh thu 14 ngày (không tính đơn huỷ/trả)</h2>
            <ol className="flex h-48 items-end gap-1" aria-label="Biểu đồ doanh thu">
              {data.revenue_series.map((d) => (
                <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${formatCurrency(d.revenue)} · ${d.orders} đơn`}>
                  <div className="w-full rounded-t bg-blue-500" style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue > 0 ? 2 : 0 }} />
                  <span className="text-[10px] text-slate-500">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-2 font-semibold">Đơn hàng gần đây</h2>
              <DataTable rows={data.recent_orders} rowKey={(o) => o.id} columns={[
                { header: "Mã đơn", cell: (o) => <Link className="font-medium text-blue-700" to={`/admin/don-hang/${o.id}`}>{o.order_code}</Link> },
                { header: "Khách", cell: (o) => o.customer_name },
                { header: "Tổng", cell: (o) => formatCurrency(o.total_amount) },
                { header: "Trạng thái", cell: (o) => <OrderStatusBadge status={o.status} /> },
                { header: "Lúc", cell: (o) => formatDateTime(o.created_at) },
              ]} />
            </section>
            <section>
              <h2 className="mb-2 font-semibold">Sắp hết hàng</h2>
              <DataTable rows={data.low_stock} rowKey={(v) => v.variant_id} empty="Không có biến thể nào sắp hết." columns={[
                { header: "Sản phẩm", cell: (v) => <Link className="text-blue-700" to={`/admin/san-pham/${v.product_id}`}>{v.product_name ?? "—"}</Link> },
                { header: "Biến thể", cell: (v) => `${v.variant_name} (${v.sku})` },
                { header: "Tồn", cell: (v) => <span className="font-semibold text-red-600">{v.stock_quantity}</span> },
              ]} />
            </section>
          </div>
        </div>
      )}
    </>
  );
}
