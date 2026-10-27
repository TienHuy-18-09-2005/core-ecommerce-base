import type { ReactNode } from "react";
import { ORDER_STATUS_LABELS } from "../../types/order.ts";
import { PAYMENT_STATUS_LABELS, PRODUCT_STATUS_LABELS } from "../../utils/adminFormat.ts";

export type BadgeTone = "pending" | "confirmed" | "processing" | "shipping" | "success" | "danger" | "neutral";

const TONES: Record<BadgeTone, string> = {
  pending: "bg-admin-status-pending-bg text-admin-status-pending-fg",
  confirmed: "bg-admin-status-confirmed-bg text-admin-status-confirmed-fg",
  processing: "bg-admin-status-processing-bg text-admin-status-processing-fg",
  shipping: "bg-admin-status-shipping-bg text-admin-status-shipping-fg",
  success: "bg-admin-status-success-bg text-admin-status-success-fg",
  danger: "bg-admin-status-danger-bg text-admin-status-danger-fg",
  neutral: "bg-admin-status-neutral-bg text-admin-status-neutral-fg",
};

/** Nhãn trạng thái dùng token R1 (đúng cả sáng và tối). Có chấm màu để không chỉ dựa vào màu chữ. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span data-tone={tone} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />{children}
    </span>
  );
}

const ORDER_TONES: Record<string, BadgeTone> = { pending: "pending", confirmed: "confirmed", packing: "processing", shipping: "shipping", delivered: "success", cancelled: "danger", returned: "neutral" };
const PAYMENT_TONES: Record<string, BadgeTone> = { unpaid: "pending", paid: "success", refunded: "neutral", failed: "danger" };
const PRODUCT_TONES: Record<string, BadgeTone> = { draft: "neutral", published: "success", archived: "pending" };

export const OrderStatusBadge = ({ status }: { status: string }) => <Badge tone={ORDER_TONES[status] ?? "neutral"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
export const PaymentStatusBadge = ({ status }: { status: string }) => <Badge tone={PAYMENT_TONES[status] ?? "neutral"}>{PAYMENT_STATUS_LABELS[status] ?? status}</Badge>;
export const ProductStatusBadge = ({ status }: { status: string }) => <Badge tone={PRODUCT_TONES[status] ?? "neutral"}>{PRODUCT_STATUS_LABELS[status] ?? status}</Badge>;
export const ReviewStatusBadge = ({ approved }: { approved: boolean }) => <Badge tone={approved ? "success" : "neutral"}>{approved ? "Đang hiện" : "Đang ẩn"}</Badge>;
