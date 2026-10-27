export type CartLineWarning = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK";

export interface CartLine {
  id: number;
  cart_id: number;
  product_variant_id: number;
  quantity: number;
  product_name?: string;
  product_slug?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  image_url?: string | null;
  unit_price?: number;
  line_total?: number;
  stock_quantity?: number;
  warning?: CartLineWarning | null;
}

/** Mọi số tiền do server tính — FE chỉ hiển thị. */
export interface CartSummary {
  item_count: number;
  subtotal: number;
  shipping_fee: number;
  /** R7: ngưỡng miễn phí ship (null = tắt) và số tiền còn thiếu để được miễn phí. */
  free_shipping_threshold?: number | null;
  free_shipping_remaining?: number | null;
  total: number;
  has_issues: boolean;
}

export interface Cart {
  id: number;
  user_id: number | null;
  items: CartLine[];
  summary?: CartSummary;
}

export function cartItemCount(cart: Cart | undefined): number {
  if (!cart?.items) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export const CART_WARNING_LABELS: Record<CartLineWarning, string> = {
  UNAVAILABLE: "Sản phẩm/biến thể đã ngừng bán — vui lòng xóa khỏi giỏ.",
  OUT_OF_STOCK: "Đã hết hàng — vui lòng xóa khỏi giỏ.",
  INSUFFICIENT_STOCK: "Không đủ tồn kho — vui lòng giảm số lượng.",
};

/** Chữ ký nội dung giỏ: đổi khi thêm/bớt/đổi số lượng → dùng để tạo Idempotency-Key mới. */
export function cartSignature(cart: Cart | undefined): string {
  if (!cart?.items?.length) {
    return "empty";
  }

  return cart.items
    .map((item) => `${item.product_variant_id}x${item.quantity}`)
    .sort()
    .join(",");
}
