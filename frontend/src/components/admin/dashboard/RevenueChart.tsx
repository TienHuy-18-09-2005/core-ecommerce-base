import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "../../../utils/formatCurrency.ts";
import type { DashboardData } from "../../../types/admin.ts";

/** Tách riêng để lazy-load (Recharts ~100KB gzip chỉ tải khi vào Tổng quan). Màu lấy từ token admin → tự đổi theo chế độ tối. */
export default function RevenueChart({ series, granularity, showRevenue }: { series: DashboardData["revenue_series"]; granularity: "hour" | "day"; showRevenue: boolean }) {
  const data = series.map((d) => ({ ...d, label: granularity === "hour" ? d.date.slice(0, 2) + "h" : `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}` }));
  const compact = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}tr` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--admin-border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--admin-muted)", fontSize: 11 }} stroke="var(--admin-border)" interval="preserveStartEnd" minTickGap={8} />
        {showRevenue && <YAxis yAxisId="rev" tickFormatter={compact} tick={{ fill: "var(--admin-muted)", fontSize: 11 }} stroke="var(--admin-border)" width={48} />}
        <YAxis yAxisId="ord" orientation={showRevenue ? "right" : "left"} allowDecimals={false} tick={{ fill: "var(--admin-muted)", fontSize: 11 }} stroke="var(--admin-border)" width={32} />
        <Tooltip
          contentStyle={{ background: "var(--admin-surface)", border: "1px solid var(--admin-border)", borderRadius: 8, color: "var(--admin-fg)" }}
          labelStyle={{ color: "var(--admin-fg)" }}
          cursor={{ fill: "var(--admin-primary-subtle)" }}
          formatter={(v, name) => (name === "Doanh thu" ? formatCurrency(Number(v)) : `${v} đơn`)}
        />
        <Legend wrapperStyle={{ color: "var(--admin-muted)", fontSize: 12 }} />
        {showRevenue && <Bar yAxisId="rev" dataKey="revenue" name="Doanh thu" fill="var(--admin-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />}
        <Line yAxisId="ord" dataKey="orders" name="Số đơn" type="monotone" stroke="var(--admin-success)" strokeWidth={2} dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
