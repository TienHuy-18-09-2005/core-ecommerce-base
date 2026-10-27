import { useCan } from "../../hooks/useCan.ts";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Printer } from "lucide-react";
import { btnPrimary, btnSecondary, formatDateTime, inputClass } from "../../utils/adminFormat.ts";
import { FormField } from "../../components/admin/form/FormField.tsx";
import { useToast } from "../../app/useToast.ts";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { PaymentStatusBadge } from "../../components/admin/Badge.tsx";
import { SkeletonBlock } from "../../components/admin/feedback.tsx";
import { CancelReasonModal } from "../../components/admin/orders/CancelReasonModal.tsx";
import { OrderStatusBadge, PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useAdminOrderQuery, useOrderNoteMutation, useOrderStatusMutation } from "../../hooks/useAdminQuery.ts";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import type { AdminOrderDetail } from "../../types/admin.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { PAYMENT_METHOD_LABELS } from "../../utils/adminFormat.ts";

/** Nhãn nút cho bước kế tiếp hợp lệ (nút chính ở đầu trang). */
export const NEXT_STEP_LABELS: Record<string, string> = {
  confirmed: "Xác nhận đơn", packing: "Chuyển đóng gói", shipping: "Bắt đầu giao hàng", delivered: "Đã giao thành công",
};
const FLOW = ["pending", "confirmed", "packing", "shipping", "delivered"];

export function nextStep(order: Pick<AdminOrderDetail, "allowed_transitions">): string | null {
  return order.allowed_transitions.find((s) => s in NEXT_STEP_LABELS) ?? null;
}

function Timeline({ order }: { order: AdminOrderDetail }) {
  const reached = new Set(order.timeline.map((t) => t.status));
  const terminal = order.status === "cancelled" || order.status === "returned";
  const upcoming = terminal ? [] : FLOW.filter((s) => !reached.has(s) && FLOW.indexOf(s) > FLOW.indexOf(order.status));
  return (
    <ol className="relative space-y-4 text-sm">
      {order.timeline.map((t, i) => {
        const bad = t.status === "cancelled" || t.status === "returned";
        return (
          <li key={`h${i}`} className="relative flex gap-3">
            <span aria-hidden className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white ${bad ? "bg-admin-danger" : "bg-admin-success"}`}><Check className="size-3" /></span>
            <div className="min-w-0">
              <p className="font-medium">{t.label}{t.from && <span className="font-normal text-admin-muted"> ({ORDER_STATUS_LABELS[t.from] ?? t.from} → {ORDER_STATUS_LABELS[t.status ?? ""] ?? t.status})</span>}</p>
              <p className="text-xs text-admin-muted">{formatDateTime(t.at)}{t.by ? ` · ${t.by}` : t.type === "created" ? " · Khách hàng" : ""}{t.backfilled ? " · suy ra từ dữ liệu cũ" : ""}</p>
              {t.note && <p className="mt-1 text-admin-fg-soft">{t.status === "cancelled" ? "Lý do: " : ""}{t.note}</p>}
            </div>
          </li>
        );
      })}
      {upcoming.map((s) => (
        <li key={s} className="flex gap-3 text-admin-muted">
          <span aria-hidden className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-dashed border-admin-border-strong" />
          <p>{ORDER_STATUS_LABELS[s]} <span className="text-xs">(chưa tới)</span></p>
        </li>
      ))}
    </ol>
  );
}

function NotesPanel({ order }: { order: AdminOrderDetail }) {
  const can = useCan();
  const [body, setBody] = useState("");
  const mutation = useOrderNoteMutation(order.id);
  const toast = useToast();
  const err = firstFieldErrors(mutation.error).body;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    mutation.mutate(body.trim(), { onSuccess: () => { setBody(""); toast.showSuccess("Đã thêm ghi chú nội bộ."); }, onError: (e2) => { if (!firstFieldErrors(e2).body) toast.showError(e2); } });
  };
  return (
    <section aria-labelledby="notes-h" className="rounded-xl border border-admin-border bg-admin-surface p-5 text-sm">
      <h2 id="notes-h" className="font-semibold">Ghi chú nội bộ</h2>
      <p className="mb-3 text-xs text-admin-muted">Chỉ quản trị viên thấy, khách hàng không xem được.</p>
      {can("orders.note") && <form onSubmit={submit} className="space-y-2" noValidate>
        <FormField label="Thêm ghi chú" error={err}>
          <textarea className={inputClass} rows={2} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
        </FormField>
        <button type="submit" className={btnSecondary} disabled={!body.trim() || mutation.isPending}>{mutation.isPending ? "Đang lưu..." : "Lưu ghi chú"}</button>
      </form>}
      {order.notes.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-admin-border pt-3">
          {order.notes.map((n) => (
            <li key={n.id}>
              <p className="whitespace-pre-line text-admin-fg">{n.body}</p>
              <p className="text-xs text-admin-muted">{n.by ?? "Hệ thống"} · {formatDateTime(n.at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function OrderDetailPage() {
  const can = useCan();
  const id = Number(useParams().id);
  const { data: order, error, isLoading, refetch, isRefetching } = useAdminOrderQuery(id);
  const confirm = useConfirm();
  const mutation = useOrderStatusMutation(id);
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) {
    return <div className="grid gap-4 lg:grid-cols-3"><SkeletonBlock lines={6} label="Đang tải đơn hàng..." className="lg:col-span-2" /><SkeletonBlock lines={4} label="" /></div>;
  }
  if (error || !order) {
    return <QueryError error={error ?? true} onRetry={refetch} retrying={isRefetching} />;
  }

  const change = (status: string, cancel_reason?: string) =>
    mutation.mutate({ status, cancel_reason }, {
      onSuccess: () => { setCancelOpen(false); toast.showSuccess(`Đơn chuyển sang "${ORDER_STATUS_LABELS[status] ?? status}".`); },
      onError: (e) => { if (!firstFieldErrors(e).cancel_reason) toast.showError(e); },
    });
  const next = nextStep(order);
  const canCancel = can("orders.cancel") && order.allowed_transitions.includes("cancelled");
  const canReturn = can("orders.update") && order.allowed_transitions.includes("returned");
  const onReturn = async () => {
    if (await confirm({ title: "Ghi nhận trả hàng?", message: "Hàng trả về không tự cộng lại tồn kho — kiểm tra hàng rồi nhập kho thủ công.", confirmLabel: "Ghi nhận trả hàng", cancelLabel: "Không", danger: true })) change("returned");
  };

  return (
    <>
      <PageHeader title={`Đơn ${order.order_code}`} actions={<div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/don-hang" className={btnSecondary}>Quay lại</Link>
        {can("orders.print") && <Link to={`/admin/don-hang/${order.id}/in`} className={`${btnSecondary} inline-flex items-center gap-1.5`}><Printer aria-hidden className="size-4" />In phiếu</Link>}
        {canReturn && <button type="button" className={btnSecondary} disabled={mutation.isPending} onClick={() => void onReturn()}>Trả hàng</button>}
        {canCancel && <button type="button" className="rounded-lg border border-admin-danger-border bg-admin-surface px-4 py-2 text-sm font-medium text-admin-danger hover:bg-admin-danger-subtle disabled:opacity-50" disabled={mutation.isPending} onClick={() => setCancelOpen(true)}>Hủy đơn</button>}
        {next && can("orders.update") && <button type="button" className={btnPrimary} disabled={mutation.isPending} onClick={() => change(next)}>{mutation.isPending ? "Đang cập nhật..." : NEXT_STEP_LABELS[next]}</button>}
      </div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-sm text-admin-fg-soft"><PaymentStatusBadge status={order.payment_status} /> · {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method.toUpperCase()}</span>
              <span className="text-sm text-admin-muted">Đặt lúc {formatDateTime(order.created_at)}</span>
            </div>
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-admin-muted"><th className="py-2">Sản phẩm</th><th>Đơn giá</th><th>SL</th><th className="text-right">Thành tiền</th></tr></thead>
              <tbody className="divide-y divide-admin-border">
                {order.items.map((it, i) => (
                  <tr key={`${it.sku}-${i}`}>
                    <td className="py-2">{it.product_name}{it.variant_name && <span className="text-admin-muted"> — {it.variant_name}</span>}<p className="text-xs text-admin-muted">{it.sku}</p></td>
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

          <section aria-labelledby="timeline-h" className="rounded-xl border border-admin-border bg-admin-surface p-5">
            <h2 id="timeline-h" className="mb-4 font-semibold">Lịch sử xử lý</h2>
            <Timeline order={order} />
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-admin-border bg-admin-surface p-5 text-sm">
            <h2 className="mb-2 font-semibold">Khách hàng</h2>
            <p>{order.customer.name}</p>
            <p>{order.customer.phone}</p>
            {order.customer.email && <p>{order.customer.email}</p>}
            <p className="mt-2 text-admin-fg-soft">{[order.shipping.address, order.shipping.ward, order.shipping.district, order.shipping.province].filter(Boolean).join(", ")}</p>
            {order.customer_note && <p className="mt-2 rounded bg-admin-warning-subtle p-2">Ghi chú của khách: {order.customer_note}</p>}
            {order.cancel_reason && <p className="mt-2 rounded bg-admin-danger-subtle p-2 text-admin-danger">Lý do hủy: {order.cancel_reason}</p>}
          </section>
          <NotesPanel order={order} />
        </div>
      </div>
      <CancelReasonModal open={cancelOpen} pending={mutation.isPending} onClose={() => setCancelOpen(false)}
        serverError={firstFieldErrors(mutation.error).cancel_reason} onSubmit={(r) => change("cancelled", r)} />
    </>
  );
}
