import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { btnPrimary, btnSecondary, formatDateTime, PAYMENT_STATUS_LABELS } from "../../utils/adminFormat.ts";
import { SkeletonBlock } from "../../components/admin/feedback.tsx";
import { QueryError } from "../../components/admin/ui.tsx";
import { Barcode } from "../../components/admin/orders/Barcode.tsx";
import { useOrderPrintQuery } from "../../hooks/useAdminQuery.ts";
import type { PrintOrder, StoreInfo } from "../../types/admin.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { PAYMENT_METHOD_LABELS } from "../../utils/adminFormat.ts";
import { readAdminPref, saveAdminPref } from "../../utils/adminPrefs.ts";

type Paper = "A5" | "A4";
const readPaper = (): Paper => (readAdminPref("print-paper") === "A4" ? "A4" : "A5");

export function parseIds(raw: string | null | undefined): number[] {
  return [...new Set((raw ?? "").split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
}

function Slip({ order, store, paper }: { order: PrintOrder; store: StoreInfo; paper: Paper }) {
  const addr = [order.shipping.address, order.shipping.ward, order.shipping.district, order.shipping.province].filter(Boolean).join(", ");
  return (
    <article data-slip className={`mx-auto mb-6 break-after-page bg-white p-6 text-[13px] leading-snug text-black shadow print:mb-0 print:p-0 print:shadow-none ${paper === "A5" ? "max-w-[148mm]" : "max-w-[210mm]"}`}>
      <header className="flex items-start justify-between gap-4 border-b border-black pb-3">
        <div>
          <p className="text-base font-bold uppercase">{store.name}</p>
          <p>{store.address ?? "Địa chỉ cửa hàng (cấu hình STORE_ADDRESS)"}</p>
          <p>ĐT: {store.phone ?? "—"}{store.email ? ` · ${store.email}` : ""}</p>
        </div>
        <div className="text-right">
          <Barcode value={order.order_code} height={40} className="ml-auto" />
          <p className="font-mono font-semibold">{order.order_code}</p>
        </div>
      </header>
      <h1 className="my-3 text-center text-lg font-bold">PHIẾU GIAO HÀNG</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-semibold">Người nhận</p>
          <p>{order.customer.name} — {order.customer.phone}</p>
          <p>{addr}</p>
        </div>
        <div className="text-right">
          <p>Ngày đặt: {formatDateTime(order.created_at)}</p>
          <p>Thanh toán: {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method} · {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}</p>
        </div>
      </div>
      <table className="mt-3 w-full border-collapse">
        <thead><tr className="border-y border-black text-left"><th className="py-1">Sản phẩm</th><th className="w-10 text-center">SL</th><th className="w-24 text-right">Đơn giá</th><th className="w-24 text-right">Thành tiền</th></tr></thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className="border-b border-gray-300 align-top">
              <td className="py-1">{it.product_name}{it.variant_name ? ` — ${it.variant_name}` : ""}{it.sku && <span className="block text-[11px] text-gray-600">{it.sku}</span>}</td>
              <td className="text-center">{it.quantity}</td><td className="text-right">{formatCurrency(it.unit_price)}</td><td className="text-right">{formatCurrency(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="ml-auto mt-2 w-64 space-y-0.5">
        <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatCurrency(order.subtotal)}</dd></div>
        <div className="flex justify-between"><dt>Phí vận chuyển</dt><dd>{formatCurrency(order.shipping_fee)}</dd></div>
        {order.discount_amount > 0 && <div className="flex justify-between"><dt>Giảm giá{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt><dd>-{formatCurrency(order.discount_amount)}</dd></div>}
        <div className="flex justify-between border-t border-black pt-1 font-bold"><dt>Tổng cộng</dt><dd>{formatCurrency(order.total_amount)}</dd></div>
      </dl>
      <p className="mt-3 rounded border-2 border-black p-2 text-center text-base font-bold">
        {order.cod_amount > 0 ? `THU HỘ (COD): ${formatCurrency(order.cod_amount)}` : "KHÔNG THU TIỀN — đã thanh toán"}
      </p>
      {order.customer_note && <p className="mt-2"><span className="font-semibold">Ghi chú:</span> {order.customer_note}</p>}
      <footer className="mt-6 grid grid-cols-2 text-center text-xs"><p>Người gửi<br /><br /><br />(ký, ghi rõ họ tên)</p><p>Người nhận<br /><br /><br />(ký, ghi rõ họ tên)</p></footer>
    </article>
  );
}

/** In phiếu giao hàng: /admin/don-hang/:id/in hoặc /admin/don-hang/in?ids=1,2,3. */
export default function OrderPrintPage() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const ids = id ? parseIds(id) : parseIds(search.get("ids"));
  const { data, error, isLoading, refetch, isRefetching } = useOrderPrintQuery(ids);
  const [paper, setPaper] = useState<Paper>(readPaper);
  const choose = (p: Paper) => { setPaper(p); saveAdminPref("print-paper", p); };

  return (
    <>
      <style>{`@page { size: ${paper}; margin: ${paper === "A5" ? "8mm" : "12mm"}; }`}</style>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <h1 className="mr-auto text-2xl font-bold">In phiếu giao hàng{data ? ` (${data.orders.length})` : ""}</h1>
        <div role="group" aria-label="Khổ giấy" className="inline-flex rounded-lg border border-admin-border-strong p-0.5">
          {(["A5", "A4"] as Paper[]).map((p) => (
            <button key={p} type="button" aria-pressed={paper === p} onClick={() => choose(p)}
              className={`rounded-md px-3 py-1.5 text-sm ${paper === p ? "bg-admin-primary font-semibold text-admin-on-primary" : "text-admin-fg-soft hover:bg-admin-subtle"}`}>{p}</button>
          ))}
        </div>
        <Link to={id ? `/admin/don-hang/${id}` : "/admin/don-hang"} className={btnSecondary}>Quay lại</Link>
        <button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5`} disabled={!data?.orders.length} onClick={() => window.print()}>
          <Printer aria-hidden className="size-4" />In
        </button>
      </div>
      {ids.length === 0 && <p className="text-admin-muted">Chưa chọn đơn nào để in.</p>}
      {isLoading && <SkeletonBlock lines={8} label="Đang chuẩn bị phiếu in..." />}
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      {data && data.orders.length === 0 && <p className="text-admin-muted">Không tìm thấy đơn để in.</p>}
      <div className="bg-admin-subtle py-6 print:bg-white print:py-0">
        {data?.orders.map((o) => <Slip key={o.id} order={o} store={data.store} paper={paper} />)}
      </div>
    </>
  );
}
