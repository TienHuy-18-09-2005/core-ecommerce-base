import type { Order } from "../../../types/order.ts";
import { ORDER_STATUS_LABELS } from "../../../types/order.ts";

const ORDER_FLOW = ["pending", "confirmed", "packing", "shipping", "delivered"] as const;

/** Task 4.6: pending → confirmed → packing → shipping → delivered; nhánh cancelled/returned. */
export function OrderTimeline({ order }: { order: Order }) {
  const terminal = order.status === "cancelled" || order.status === "returned";
  const reached = ORDER_FLOW.indexOf(order.status as (typeof ORDER_FLOW)[number]);
  const timeOf: Record<string, string | null | undefined> = {
    pending: order.created_at,
    confirmed: order.confirmed_at,
    delivered: order.delivered_at,
  };

  return (
    <div>
      <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Tiến trình đơn hàng">
        {ORDER_FLOW.map((step, i) => {
          const done = !terminal && i <= reached;
          const current = !terminal && i === reached;
          return (
            <li key={step} className="flex flex-1 items-center gap-2 sm:flex-col sm:text-center" aria-current={current ? "step" : undefined} data-done={done}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                {i + 1}
              </span>
              <span className={`text-sm ${current ? "font-bold text-slate-900" : "text-slate-600"}`}>{ORDER_STATUS_LABELS[step]}</span>
              {done && timeOf[step] ? (
                <time className="text-xs text-slate-500" dateTime={timeOf[step]!}>{new Date(timeOf[step]!).toLocaleString("vi-VN")}</time>
              ) : null}
            </li>
          );
        })}
      </ol>
      {terminal ? (
        <p role="status" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
          Đơn hàng {ORDER_STATUS_LABELS[order.status].toLowerCase()}
          {order.cancelled_at ? ` lúc ${new Date(order.cancelled_at).toLocaleString("vi-VN")}` : ""}.
        </p>
      ) : null}
    </div>
  );
}
