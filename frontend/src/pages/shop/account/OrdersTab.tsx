import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { accountService } from "../../../services/accountService.ts";
import { ORDER_STATUS_LABELS } from "../../../types/order.ts";
import { formatCurrency } from "../../../utils/formatCurrency.ts";

export function OrdersTab() {
  const [page, setPage] = useState(1);
  const orders = useQuery({
    queryKey: ["orders", "mine", "list", page],
    queryFn: ({ signal }) => accountService.orders(page, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  if (orders.isPending) return <p>Đang tải đơn hàng...</p>;
  if (orders.isError) {
    return <p role="alert" className="text-red-700">Không tải được đơn hàng. <button type="button" className="underline" onClick={() => orders.refetch()}>Thử lại</button></p>;
  }
  if (orders.data.data.length === 0) {
    return <p className="text-slate-600">Bạn chưa có đơn hàng nào. <Link to="/san-pham" className="font-semibold text-blue-700">Mua sắm ngay</Link></p>;
  }

  const { meta } = orders.data;
  return (
    <div>
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b"><th className="py-2">Mã đơn</th><th>Ngày đặt</th><th>Trạng thái</th><th className="text-right">Tổng tiền</th></tr></thead>
        <tbody>
          {orders.data.data.map((o) => (
            <tr key={o.order_code} className="border-b">
              <td className="py-2"><Link to={`/tai-khoan/don-hang/${encodeURIComponent(o.order_code)}`} className="font-semibold text-blue-700">{o.order_code}</Link></td>
              <td>{o.created_at ? new Date(o.created_at).toLocaleDateString("vi-VN") : ""}</td>
              <td>{ORDER_STATUS_LABELS[o.status] ?? o.status}</td>
              <td className="text-right tabular-nums">{formatCurrency(o.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {meta.last_page > 1 ? (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Trước</button>
          <span>Trang {meta.current_page}/{meta.last_page}</span>
          <button type="button" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Sau</button>
        </div>
      ) : null}
    </div>
  );
}
