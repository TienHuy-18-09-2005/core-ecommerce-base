import type { DashboardData } from "../types/admin.ts";

/** Dữ liệu dashboard giả cho test; `revenue` = false mô phỏng server ẩn doanh thu. */
export function dashboardFixture(opts: { revenue?: boolean; orders?: boolean; products?: boolean; reviews?: boolean; coupons?: boolean } = {}, over: Partial<DashboardData> = {}): DashboardData {
  const { revenue = true, orders = true, products = true, reviews = true, coupons = true } = opts;
  return {
    range: { key: "14d", days: 14, from: "2026-10-14", to: "2026-10-27", previous_from: "2026-09-30", previous_to: "2026-10-13", timezone: "Asia/Ho_Chi_Minh" },
    granularity: "day",
    kpis: {
      orders: { current: 12, previous: 8, change_pct: 50 },
      ...(revenue ? { revenue: { current: 900000, previous: 1000000, change_pct: -10 }, avg_order_value: { current: 75000, previous: 125000, change_pct: -40 } } : {}),
      ...(orders ? { pending_orders: 2 } : {}),
      ...(products ? { low_stock_variants: 1 } : {}),
    },
    stats: {},
    todo: {
      ...(orders ? { pending_orders: 2 } : {}),
      ...(reviews ? { hidden_reviews: 4 } : {}),
      ...(coupons ? { expiring_coupons: 1 } : {}),
      ...(products ? { low_stock_variants: 1 } : {}),
    },
    revenue_series: [{ date: "2026-10-26", orders: 3, ...(revenue ? { revenue: 450000 } : {}) }],
    status_breakdown: {},
    top_products: products ? [{ product_id: 5, name: "Bóng đèn", quantity: 7, ...(revenue ? { revenue: 350000 } : {}) }] : [],
    recent_orders: [],
    low_stock: products ? [{ variant_id: 9, product_id: 5, product_name: "Bóng đèn", variant_name: "9W", sku: "BD-9", stock_quantity: 2 }] : [],
    ...over,
  };
}
