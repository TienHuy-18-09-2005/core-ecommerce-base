export interface OrderItem {
  product_name: string;
  variant_name: string;
  sku: string;
  thumbnail_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  order_code: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string | null;
  confirmed_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  items: OrderItem[];
  customer: { name: string; phone: string; email: string | null };
  shipping: { province: string; district: string; ward: string | null; address: string | null };
  customer_note: string | null;
}

export interface CheckoutInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  shipping_province: string;
  shipping_district: string;
  shipping_ward: string;
  shipping_address: string;
  customer_note?: string;
  payment_method: "cod";
  coupon_code?: string;
}

export interface CouponPreview {
  code: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã huỷ",
  returned: "Đã trả hàng",
};
