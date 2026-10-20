import type { Cart } from "../types/cart.ts";
import { apiClient } from "./apiClient.ts";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await apiClient.get<ApiSuccess<Cart>>("/cart");
    return response.data.data;
  },

  async addToCart(productVariantId: number, quantity: number): Promise<Cart> {
    const response = await apiClient.post<ApiSuccess<Cart>>("/cart", {
      product_variant_id: productVariantId,
      quantity,
    });
    return response.data.data;
  },

  async updateQuantity(itemId: number, quantity: number): Promise<Cart> {
    const response = await apiClient.put<ApiSuccess<Cart>>(`/cart/${itemId}`, {
      quantity,
    });
    return response.data.data;
  },

  async removeItem(itemId: number): Promise<Cart> {
    const response = await apiClient.delete<ApiSuccess<Cart>>(`/cart/${itemId}`);
    return response.data.data;
  },
};
