export interface CartLine {
  id: number;
  cart_id: number;
  product_variant_id: number;
  quantity: number;
}

export interface Cart {
  id: number;
  user_id: number | null;
  items: CartLine[];
}

export function cartItemCount(cart: Cart | undefined): number {
  if (!cart?.items) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}
