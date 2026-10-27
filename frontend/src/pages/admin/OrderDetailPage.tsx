import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { PAYMENT_STATUS_LABELS, btnPrimary, btnSecondary, formatDateTime, inputClass } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { OrderStatusBadge, PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useAdminOrderQuery, useOrderStatusMutation } from "../../hooks/useAdminQuery.ts";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

export default function OrderDetailPage() {
  const id = Number(useParams().id);
  const { data: order, error, isLoading } = useAdminOrderQuery(id);
  const mutation = useOrderStatusMutation(id);
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const errors = firstFieldErrors(mutation.error);

  if (isLoading) {
    return <p>Đang tải đơn hàng...</p>;
  }
  if (error || !order) {
    return <QueryError error={error ?? true} />;
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!status) {
      return;
    }
    if (status === "cancelled" && !window.confirm("Hủy đơn sẽ hoàn lại tồn kho và lượt dùng mã giảm giá. Tiếp tục?")) {
      return;
    }
    mutation.mutate(
      { status, admin_note: note || undefined, cancel_reason: status === "cancelled" ? reason : undefined },
      {
        onSuccess: () => { toast.showSuccess("Đã cập nhật trạng thái đơn."); setStatus(""); setNote(""); setReason(""); },
        onError: toast.showError,
      },
    );
  };

  return (
    <>
      <PageHeader title={`Đơn ${order.order_code}`} actions={<Link to="/admin/don-hang" className={btnSecondary}>Quay lại</Link>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-slate-600">{PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status} · {order.payment_method.toUpperCase()}</span>
              <span className="text-sm text-slate-500">Đặt lúc {formatDateTime(order.created_at)}</span>
            </div>
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-slate-500"><th className="py-2">Sản phẩm</th><th>Đơn giá</th><th>SL</th><th className="text-right">Thành tiền</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((it, i) => (
                  <tr key={`${it.sku}-${i}`}>
                    <td className="py-2">{it.product_name}{it.variant_name && <span className="text-slate-500"> — {it.variant_name}</span>}<p className="text-xs text-slate-400">{it.sku}</p></td>
                    <td>{formatCurrency(it.unit_price)}</td><td>{it.quantity}</td><td className="text-right">{formatCurrency(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 space-y-1 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
              {order.discount_amount > 0 && <div className="flex justify-between"><dt>Giảm giá{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>-{formatCurrency(order.discount_amount)}</dd></div>}
              <div className="flex justify-between"><dt>Phí vận chuyển</dt><dd>{formatCurrency(order.shipping_fee)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Tổng cộng</dt><dd>{formatCurrency(order.total_amount)}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Lịch sử xử lý</h2>
            <ol className="space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
              {order.timeline.map((t, i) => (
                <li key={i}>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(t.at)}{t.by ? ` · ${t.by}` : ""}</p>
                  {t.note && <p className="text-slate-600">{t.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-semibold">Khách hàng</h2>
            <p>{order.customer.name}</p>
            <p>{order.customer.phone}</p>
            {order.customer.email && <p>{order.customer.email}</p>}
            <p className="mt-2 text-slate-600">{[order.shipping.address, order.shipping.ward, order.shipping.district, order.shipping.province].filter(Boolean).join(", ")}</p>
            {order.customer_note && <p className="mt-2 rounded bg-amber-50 p-2">Ghi chú: {order.customer_note}</p>}
            {order.cancel_reason && <p className="mt-2 rounded bg-red-50 p-2 text-red-700">Lý do hủy: {order.cancel_reason}</p>}
            {order.admin_note && <p className="mt-2 rounded bg-slate-50 p-2">Ghi chú nội bộ: {order.admin_note}</p>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold">Cập nhật trạng thái</h2>
            {order.allowed_transitions.length === 0 ? (
              <p className="text-sm text-slate-500">Đơn đã ở trạng thái cuối, không thể chuyển tiếp.</p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3 text-sm" noValidate>
                <label className="block">
                  <span className="mb-1 block font-medium">Trạng thái mới</span>
                  <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">— Chọn —</option>
                    {order.allowed_transitions.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s] ?? s}</option>)}
                  </select>
                  {errors.status && <span role="alert" className="text-xs text-red-600">{errors.status}</span>}
                </label>
                {status === "cancelled" && (
                  <label className="block">
                    <span className="mb-1 block font-medium">Lý do hủy</span>
                    <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} />
                    {errors.cancel_reason && <span role="alert" className="text-xs text-red-600">{errors.cancel_reason}</span>}
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block font-medium">Ghi chú nội bộ</span>
                  <textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
                <button type="submit" className={btnPrimary} disabled={!status || mutation.isPending}>{mutation.isPending ? "Đang cập nhật..." : "Cập nhật"}</button>
              </form>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
