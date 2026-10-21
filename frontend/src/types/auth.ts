export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  /** false = chưa xác thực email: vẫn duyệt/giỏ/đăng nhập, nhưng không đặt hàng bằng tài khoản. */
  email_verified: boolean;
}

/** Điều chỉnh khi server gộp giỏ khách vào giỏ tài khoản. */
export interface CartAdjustment {
  product_variant_id: number;
  product_name: string | null;
  requested: number;
  quantity: number;
  reason: "INSUFFICIENT_STOCK" | "UNAVAILABLE";
}

export interface AuthResult {
  user: User;
  cart_adjustments: CartAdjustment[];
}

export interface Address {
  id: number;
  recipient_name: string;
  recipient_phone: string;
  province: string;
  district: string;
  ward: string;
  street_address: string;
  is_default: boolean;
}

export type AddressInput = Omit<Address, "id">;

export function describeAdjustment(a: CartAdjustment): string {
  const name = a.product_name ?? `Sản phẩm #${a.product_variant_id}`;
  if (a.reason === "UNAVAILABLE") {
    return `${name} đã ngừng bán nên được bỏ khỏi giỏ.`;
  }
  return a.quantity > 0
    ? `${name}: chỉ còn ${a.quantity} trong kho (bạn chọn ${a.requested}), đã giảm số lượng.`
    : `${name} đã hết hàng nên được bỏ khỏi giỏ.`;
}

/** Chỉ cho redirect nội bộ: "/..." nhưng không "//host" (chống open redirect). */
export function safeRedirect(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
