import type { CouponPreview } from "../types/order.ts";
import { apiClient } from "./apiClient.ts";

export const couponService = {
  /** Chỉ xem trước (throttle 10/phút ở server); số tiền chính thức tính lại khi đặt hàng. */
  async check(code: string): Promise<CouponPreview> {
    const response = await apiClient.post<{ success: boolean; data: CouponPreview }>("/coupons/check", { code });
    return response.data.data;
  },
};
