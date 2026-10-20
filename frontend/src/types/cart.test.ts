import { describe, expect, it } from "vitest";
import { cartItemCount, type Cart } from "./cart.ts";

describe("cartItemCount", () => {
  it("sums line quantities", () => {
    const cart: Cart = {
      id: 1,
      user_id: null,
      items: [
        { id: 1, cart_id: 1, product_variant_id: 4, quantity: 2 },
        { id: 2, cart_id: 1, product_variant_id: 8, quantity: 1 },
      ],
    };

    expect(cartItemCount(cart)).toBe(3);
    expect(cartItemCount(undefined)).toBe(0);
  });
});
