import type { Order } from "../../../types/order.ts";
import { ORDER_STATUS_LABELS } from "../../../types/order.ts";
import { formatCurrency } from "../../../utils/formatCurrency.ts";

export function OrderSummaryView({ order }: { order: Order }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4" data-testid="order-summary">
      <p className="text-sm text-slate-600">
        Mã đơn: <strong className="text-slate-900">{order.order_code}</strong> · Trạng thái:{" "}
        <strong>{ORDER_STATUS_LABELS[order.status] ?? order.status}</strong>
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Người nhận: {order.customer.name} · {order.customer.phone}
        {order.shipping.address ? ` · ${order.shipping.address}, ${order.shipping.ward}, ${order.shipping.district}, ${order.shipping.province}` : ` · ${order.shipping.district}, ${order.shipping.province}`}
      </p>
      <ul className="mt-3 divide-y">
        {order.items.map((item) => (
          <li key={item.sku} className="flex justify-between gap-3 py-2 text-sm">
            <span>{item.product_name} ({item.variant_name}) × {item.quantity}</span>
            <span className="tabular-nums">{formatCurrency(item.line_total)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
        <div className="flex justify-between"><dt>Tạm tính</dt><dd className="tabular-nums">{formatCurrency(order.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Phí vận chuyển</dt><dd className="tabular-nums">{formatCurrency(order.shipping_fee)}</dd></div>
        {order.discount_amount > 0 ? (
          <div className="flex justify-between text-green-700"><dt>Giảm giá</dt><dd className="tabular-nums">-{formatCurrency(order.discount_amount)}</dd></div>
        ) : null}
        <div className="flex justify-between text-base font-bold"><dt>Tổng thanh toán (COD)</dt><dd className="tabular-nums text-red-600">{formatCurrency(order.total_amount)}</dd></div>
      </dl>
    </div>
  );
}
