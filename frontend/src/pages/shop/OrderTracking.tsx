import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Breadcrumb } from "../../components/shop/catalog/Breadcrumb.tsx";
import { OrderSummaryView } from "../../components/shop/order/OrderSummaryView.tsx";
import { OrderTimeline } from "../../components/shop/order/OrderTimeline.tsx";
import { orderService } from "../../services/orderService.ts";
import { errorMessage } from "../../utils/fieldErrors.ts";

export function OrderTracking() {
  const { code = "" } = useParams<{ code: string }>();
  const order = useQuery({
    queryKey: ["orders", "mine", code],
    queryFn: ({ signal }) => orderService.getMyOrder(code, signal),
    // Trạng thái đơn thay đổi theo admin → lấy mới thường xuyên hơn mặc định
    staleTime: 30_000,
  });

  return (
    <section aria-labelledby="theo-doi-don" className="mx-auto max-w-4xl space-y-4">
      <Breadcrumb items={[{ label: "Trang chủ", to: "/" }, { label: "Tài khoản", to: "/tai-khoan?tab=don-hang" }, { label: code }]} />
      <h1 id="theo-doi-don" className="text-2xl font-bold">Theo dõi đơn hàng {code}</h1>
      {order.isPending ? <p>Đang tải đơn hàng...</p> : null}
      {order.isError ? (
        <p role="alert" className="text-red-700">
          {errorMessage(order.error, "Không tải được đơn hàng.")}{" "}
          <Link to="/tai-khoan?tab=don-hang" className="underline">Về danh sách đơn</Link>
        </p>
      ) : null}
      {order.data ? (
        <>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><OrderTimeline order={order.data} /></div>
          <OrderSummaryView order={order.data} />
        </>
      ) : null}
    </section>
  );
}
