import type { CartSummary } from "../../../types/cart.ts";
import type { CouponPreview } from "../../../types/order.ts";
import { formatCurrency } from "../../../utils/formatCurrency.ts";

/** Hiển thị đúng số server trả về (giỏ hoặc preview coupon); FE không tự cộng tổng. */
export function CartSummaryBox({ summary, preview }: { summary: CartSummary; preview?: CouponPreview | null }) {
  const subtotal = preview?.subtotal ?? summary.subtotal;
  const shipping = preview?.shipping_fee ?? summary.shipping_fee;
  const total = preview?.total ?? summary.total;

  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>Tạm tính</dt><dd className="tabular-nums">{formatCurrency(subtotal)}</dd></div>
      <div className="flex justify-between"><dt>Phí vận chuyển</dt><dd className="tabular-nums">{formatCurrency(shipping)}</dd></div>
      {preview && preview.discount_amount > 0 ? (
        <div className="flex justify-between text-green-700">
          <dt>Giảm giá ({preview.code})</dt><dd className="tabular-nums">-{formatCurrency(preview.discount_amount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t pt-2 text-base font-bold">
        <dt>Tổng cộng</dt><dd className="tabular-nums text-red-600" data-testid="cart-total">{formatCurrency(total)}</dd>
      </div>
    </dl>
  );
}
