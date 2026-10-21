import type { CheckoutInput, Order } from "../types/order.ts";
import { apiClient } from "./apiClient.ts";

interface OrderResponse {
  success: boolean;
  data: Order;
  meta?: { replayed?: boolean };
}

export const orderService = {
  /** Idempotency-Key giữ nguyên khi retry → server trả lại đúng đơn cũ, không tạo trùng. */
  async createOrder(input: CheckoutInput, idempotencyKey: string): Promise<{ order: Order; replayed: boolean }> {
    const response = await apiClient.post<OrderResponse>("/checkout", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return { order: response.data.data, replayed: Boolean(response.data.meta?.replayed) };
  },

  async lookup(orderCode: string, phone: string): Promise<Order> {
    const response = await apiClient.post<OrderResponse>("/orders/lookup", { order_code: orderCode, phone });
    return response.data.data;
  },

  async getMyOrder(orderCode: string, signal?: AbortSignal): Promise<Order> {
    const response = await apiClient.get<OrderResponse>(`/user/orders/${encodeURIComponent(orderCode)}`, { signal });
    return response.data.data;
  },
};
