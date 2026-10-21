import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { OrderLookupForm } from "../../components/shop/order/OrderLookupForm.tsx";
import { OrderSummaryView } from "../../components/shop/order/OrderSummaryView.tsx";
import { orderService } from "../../services/orderService.ts";
import type { Order } from "../../types/order.ts";

interface SuccessState {
  order?: Order;
  priceChanged?: boolean;
}

/**
 * Task 3.5: đơn vừa đặt lấy từ state điều hướng. Khi refresh (mất state):
 * user đăng nhập → /api/user/orders/{code} (Policy chủ đơn); khách → form tra cứu mã + SĐT.
 */
export function OrderSuccess() {
  const { code = "" } = useParams<{ code: string }>();
  const state = (useLocation().state ?? {}) as SuccessState;
  const fromState = state.order?.order_code === code ? state.order : undefined;

  const mine = useQuery({
    queryKey: ["orders", "mine", code],
    queryFn: ({ signal }) => orderService.getMyOrder(code, signal),
    enabled: !fromState && code !== "",
    retry: false,
  });

  const order = fromState ?? mine.data;

  return (
    <section aria-labelledby="dat-hang-thanh-cong" className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
        <h1 id="dat-hang-thanh-cong" className="mt-2 text-2xl font-bold text-slate-900">Đặt hàng thành công!</h1>
        <p className="mt-1 text-slate-700">
          Mã đơn của bạn: <strong>{code}</strong>. Vui lòng lưu lại mã đơn và số điện thoại để tra cứu.
        </p>
      </div>
      {state.priceChanged && fromState ? (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Giá hoặc ưu đãi đã thay đổi so với lúc bạn xem. Tổng tiền dưới đây là số chính thức của đơn hàng.
        </p>
      ) : null}
      {order ? <OrderSummaryView order={order} /> : null}
      {!order && mine.isPending && mine.fetchStatus !== "idle" ? <p>Đang tải đơn hàng...</p> : null}
      {!order && mine.isError ? (
        <div>
          <p className="mb-2 text-sm text-slate-600">Nhập số điện thoại đặt hàng để xem lại chi tiết đơn.</p>
          <OrderLookupForm initialCode={code} />
        </div>
      ) : null}
      <Link to="/san-pham" className="inline-block font-semibold text-blue-700">Tiếp tục mua sắm</Link>
    </section>
  );
}
