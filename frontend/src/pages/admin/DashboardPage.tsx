import { lazy, Suspense, useRef, type KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState, Skeleton } from "../../components/admin/feedback.tsx";
import { DataTable, OrderStatusBadge, PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useDashboardQuery } from "../../hooks/useAdminQuery.ts";
import { useCan } from "../../hooks/useCan.ts";
import type { DashboardData, DashboardRange, KpiPair } from "../../types/admin.ts";
import { formatDateTime } from "../../utils/adminFormat.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

const RevenueChart = lazy(() => import("../../components/admin/dashboard/RevenueChart.tsx"));

export const RANGES: { key: DashboardRange; label: string; prev: string }[] = [
  { key: "today", label: "Hôm nay", prev: "hôm qua" },
  { key: "7d", label: "7 ngày", prev: "7 ngày trước" },
  { key: "14d", label: "14 ngày", prev: "14 ngày trước" },
  { key: "30d", label: "30 ngày", prev: "30 ngày trước" },
];

const isRange = (v: string | null): v is DashboardRange => RANGES.some((r) => r.key === v);

/** Chuỗi % so kỳ trước, dùng chung cho thẻ KPI và test. */
export function formatChange(pct: number | null): { text: string; tone: "up" | "down" | "flat" | "none" } {
  if (pct === null) return { text: "Chưa có dữ liệu kỳ trước", tone: "none" };
  if (pct === 0) return { text: "Không đổi", tone: "flat" };
  const abs = Math.abs(pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  return pct > 0 ? { text: `▲ ${abs}%`, tone: "up" } : { text: `▼ ${abs}%`, tone: "down" };
}

const TONE = { up: "text-admin-success", down: "text-admin-danger", flat: "text-admin-muted", none: "text-admin-muted" };

function Kpi({ label, pair, money, prevLabel }: { label: string; pair: KpiPair; money?: boolean; prevLabel: string }) {
  const c = formatChange(pair.change_pct);
  const fmt = (v: number) => (money ? formatCurrency(v) : v.toLocaleString("vi-VN"));
  return (
    <div className="rounded-xl border border-admin-border bg-admin-surface p-4" data-testid={`kpi-${label}`}>
      <p className="text-sm text-admin-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-admin-fg">{fmt(pair.current)}</p>
      <p className="mt-1 text-xs">
        <span className={`font-medium ${TONE[c.tone]}`}>{c.text}</span>
        <span className="text-admin-muted"> · {prevLabel}: {fmt(pair.previous)}</span>
      </p>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-admin-border bg-admin-surface p-4" aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-admin-fg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Todo({ data }: { data: DashboardData }) {
  const t = data.todo;
  const items = [
    t.pending_orders !== undefined && { n: t.pending_orders, text: "đơn chờ xác nhận", to: "/admin/don-hang?status=pending" },
    t.hidden_reviews !== undefined && { n: t.hidden_reviews, text: "đánh giá đang ẩn", to: "/admin/danh-gia?visibility=hidden" },
    t.expiring_coupons !== undefined && { n: t.expiring_coupons, text: "mã giảm giá hết hạn trong 7 ngày", to: "/admin/ma-giam-gia" },
    t.low_stock_variants !== undefined && { n: t.low_stock_variants, text: "biến thể sắp hết hàng", to: "/admin/san-pham?low_stock=1" },
  ].filter(Boolean) as { n: number; text: string; to: string }[];
  if (!items.length) return null;
  const open = items.filter((i) => i.n > 0);
  return (
    <Card title="Việc cần làm">
      {open.length === 0 ? <p className="text-sm text-admin-muted">Mọi thứ đã xử lý xong 🎉</p> : (
        <ul className="divide-y divide-admin-border" data-testid="todo-list">
          {open.map((i) => (
            <li key={i.to}>
              <Link to={i.to} className="flex items-center justify-between gap-3 py-2 text-sm text-admin-fg hover:text-admin-primary focus-visible:outline-2 focus-visible:outline-admin-primary">
                <span><span className="mr-1 inline-flex min-w-7 justify-center rounded-full bg-admin-warning-subtle px-2 font-semibold">{i.n}</span> {i.text}</span>
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RangePicker({ value, onChange }: { value: DashboardRange; onChange: (r: DashboardRange) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : RANGES.length - 1)) % RANGES.length;
    onChange(RANGES[n].key);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Khoảng thời gian" className="inline-flex rounded-lg border border-admin-border bg-admin-surface p-0.5">
      {RANGES.map((r, i) => (
        <button key={r.key} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={value === r.key} tabIndex={value === r.key ? 0 : -1}
          onClick={() => onChange(r.key)} onKeyDown={(e) => onKey(e, i)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-admin-primary ${value === r.key ? "bg-admin-primary text-white" : "text-admin-fg-soft hover:bg-admin-primary-subtle"}`}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

const ChartSkeleton = () => <div role="status" className="h-[280px]"><span className="sr-only">Đang tải biểu đồ...</span><Skeleton className="h-full w-full" /></div>;

export default function DashboardPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("range");
  const range: DashboardRange = isRange(raw) ? raw : "14d";
  const { data, error, isLoading, refetch, isRefetching, isPlaceholderData } = useDashboardQuery(range);
  const can = useCan();
  const meta = RANGES.find((r) => r.key === range)!;
  // Server bỏ hẳn khóa doanh thu khi thiếu revenue.view — UI dựa vào dữ liệu thật, không chỉ quyền client.
  const showRevenue = !!data?.kpis.revenue && can("revenue.view");
  const setRange = (r: DashboardRange) => setParams((p) => { const n = new URLSearchParams(p); if (r === "14d") n.delete("range"); else n.set("range", r); return n; }, { replace: true });
  const hasOrdersInRange = !!data?.revenue_series.some((d) => d.orders > 0);

  return (
    <>
      <PageHeader title="Tổng quan" actions={<RangePicker value={range} onChange={setRange} />} />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      {isLoading && (
        <div role="status" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <span className="sr-only">Đang tải...</span>
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-4"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-7 w-2/3" /><Skeleton className="h-3 w-3/4" /></div>)}
        </div>
      )}
      {data && (
        <div className={`space-y-6 transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`} aria-busy={isPlaceholderData}>
          <p className="text-xs text-admin-muted">
            {data.range.from === data.range.to ? `Ngày ${data.range.to}` : `${data.range.from} → ${data.range.to}`} · so với {meta.prev} · không tính đơn hủy/trả hàng vào doanh thu
          </p>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {showRevenue && data.kpis.revenue && <Kpi label="Doanh thu" pair={data.kpis.revenue} money prevLabel="Kỳ trước" />}
            <Kpi label="Số đơn" pair={data.kpis.orders} prevLabel="Kỳ trước" />
            {showRevenue && data.kpis.avg_order_value && <Kpi label="Giá trị đơn TB" pair={data.kpis.avg_order_value} money prevLabel="Kỳ trước" />}
            {data.kpis.pending_orders !== undefined && (
              <Link to="/admin/don-hang?status=pending" className="rounded-xl border border-admin-border bg-admin-surface p-4 hover:border-admin-primary">
                <p className="text-sm text-admin-muted">Đơn chờ xác nhận</p>
                <p className="mt-1 text-2xl font-bold text-admin-fg">{data.kpis.pending_orders}</p>
                <p className="mt-1 text-xs text-admin-primary">Xử lý ngay ›</p>
              </Link>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card title={showRevenue ? "Doanh thu & số đơn" : "Số đơn theo thời gian"}>
                {hasOrdersInRange ? (
                  <figure aria-label={showRevenue ? "Biểu đồ doanh thu và số đơn" : "Biểu đồ số đơn"}>
                    <Suspense fallback={<ChartSkeleton />}>
                      <RevenueChart series={data.revenue_series} granularity={data.granularity} showRevenue={showRevenue} />
                    </Suspense>
                    {/* Bảng ẩn cho trình đọc màn hình — biểu đồ SVG không đọc được. */}
                    <table className="sr-only">
                      <caption>Số liệu theo {data.granularity === "hour" ? "giờ" : "ngày"}</caption>
                      <thead><tr><th>Thời gian</th>{showRevenue && <th>Doanh thu</th>}<th>Số đơn</th></tr></thead>
                      <tbody>{data.revenue_series.map((d) => <tr key={d.date}><td>{d.date}</td>{showRevenue && <td>{formatCurrency(d.revenue ?? 0)}</td>}<td>{d.orders}</td></tr>)}</tbody>
                    </table>
                  </figure>
                ) : <EmptyState title="Chưa có đơn hàng trong khoảng này" description="Thử chọn khoảng thời gian dài hơn." />}
              </Card>
            </div>
            <Todo data={data} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {can("products.view") && (
              <Card title="Sản phẩm bán chạy">
                {data.top_products.length === 0 ? <p className="text-sm text-admin-muted">Chưa có sản phẩm nào được bán trong khoảng này.</p> : (
                  <ol className="space-y-2" data-testid="top-products">
                    {data.top_products.map((p, i) => (
                      <li key={`${p.product_id}-${i}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-5 shrink-0 text-admin-muted">{i + 1}.</span>
                          {p.product_id ? <Link className="truncate text-admin-primary" to={`/admin/san-pham/${p.product_id}`}>{p.name}</Link> : <span className="truncate">{p.name}</span>}
                        </span>
                        <span className="shrink-0 text-admin-fg-soft">{p.quantity} đã bán{p.revenue !== undefined && showRevenue ? ` · ${formatCurrency(p.revenue)}` : ""}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            )}
            {can("products.view") && (
              <Card title="Sắp hết hàng" action={<Link className="text-sm text-admin-primary" to="/admin/san-pham?low_stock=1">Xem tất cả</Link>}>
                <DataTable rows={data.low_stock} rowKey={(v) => v.variant_id} empty="Không có biến thể nào sắp hết." columns={[
                  { header: "Sản phẩm", cell: (v) => <Link className="text-admin-primary" to={`/admin/san-pham/${v.product_id}`}>{v.product_name ?? "—"}</Link> },
                  { header: "Biến thể", cell: (v) => `${v.variant_name} (${v.sku})` },
                  { header: "Tồn", cell: (v) => <span className="font-semibold text-admin-danger">{v.stock_quantity}</span> },
                ]} />
              </Card>
            )}
            {can("orders.view") && (
              <div className="lg:col-span-2">
                <Card title="Đơn hàng gần đây" action={<Link className="text-sm text-admin-primary" to="/admin/don-hang">Xem tất cả</Link>}>
                  <DataTable rows={data.recent_orders.slice(0, 5)} rowKey={(o) => o.id} empty="Chưa có đơn hàng." columns={[
                    { header: "Mã đơn", cell: (o) => <Link className="font-medium text-admin-primary" to={`/admin/don-hang/${o.id}`}>{o.order_code}</Link> },
                    { header: "Khách", cell: (o) => o.customer_name },
                    { header: "Tổng", cell: (o) => formatCurrency(o.total_amount) },
                    { header: "Trạng thái", cell: (o) => <OrderStatusBadge status={o.status} /> },
                    { header: "Lúc", cell: (o) => formatDateTime(o.created_at) },
                  ]} />
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
