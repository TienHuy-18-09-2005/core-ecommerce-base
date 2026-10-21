import { useAuth } from "../../app/useAuth.ts";
import { describeAdjustment } from "../../types/auth.ts";

/** Thông báo sau khi server gộp giỏ khách vào tài khoản và phải điều chỉnh (task 4.8). */
export function CartAdjustmentNotice() {
  const { cartAdjustments, dismissCartAdjustments } = useAuth();
  if (cartAdjustments.length === 0) {
    return null;
  }

  return (
    <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Giỏ hàng của bạn đã được gộp, một số sản phẩm được điều chỉnh:</p>
          <ul className="mt-1 list-disc pl-5">
            {cartAdjustments.map((a) => <li key={a.product_variant_id}>{describeAdjustment(a)}</li>)}
          </ul>
        </div>
        <button type="button" onClick={dismissCartAdjustments} className="font-medium underline">Đóng</button>
      </div>
    </div>
  );
}
