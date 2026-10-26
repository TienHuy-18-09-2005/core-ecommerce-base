import type {
  AdminCategory, AdminCategoryInput, AdminCoupon, AdminCouponInput, AdminOrderDetail, AdminProduct,
  AdminProductInput, AdminProductRow, AdminReview, DashboardData, OrderSummaryRow, Paginated,
} from "../types/admin.ts";
import { apiClient } from "./apiClient.ts";

type Envelope<T> = { success: boolean; message?: string; data: T };
type PageEnvelope<T> = Envelope<T[]> & { meta: Paginated<T>["meta"] };

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Bỏ tham số rỗng để URL/khóa cache gọn. */
export function cleanParams(params: QueryParams): QueryParams {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false));
}

async function page<T>(url: string, params: QueryParams, signal?: AbortSignal): Promise<Paginated<T>> {
  const res = await apiClient.get<PageEnvelope<T>>(url, { params: cleanParams(params), signal });
  return { data: res.data.data, meta: res.data.meta };
}

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
  return (await apiClient.get<Envelope<T>>(url, { signal })).data.data;
}

export const adminService = {
  dashboard: (signal?: AbortSignal) => get<DashboardData>("/admin/dashboard", signal),

  products: (params: QueryParams, signal?: AbortSignal) => page<AdminProductRow>("/admin/products", params, signal),
  product: (id: number, signal?: AbortSignal) => get<AdminProduct>(`/admin/products/${id}`, signal),
  createProduct: async (input: AdminProductInput) => (await apiClient.post<Envelope<AdminProduct>>("/admin/products", input)).data.data,
  updateProduct: async (id: number, input: AdminProductInput) => (await apiClient.put<Envelope<AdminProduct>>(`/admin/products/${id}`, input)).data.data,
  deleteProduct: async (id: number) => { await apiClient.delete(`/admin/products/${id}`); },
  uploadImage: async (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return (await apiClient.post<Envelope<{ url: string; path: string }>>("/admin/products/images", form)).data.data;
  },

  categories: (signal?: AbortSignal) => get<AdminCategory[]>("/admin/categories", signal),
  createCategory: async (input: AdminCategoryInput) => (await apiClient.post<Envelope<AdminCategory>>("/admin/categories", input)).data.data,
  updateCategory: async (id: number, input: AdminCategoryInput) => (await apiClient.put<Envelope<AdminCategory>>(`/admin/categories/${id}`, input)).data.data,
  deleteCategory: async (id: number) => { await apiClient.delete(`/admin/categories/${id}`); },

  coupons: (params: QueryParams, signal?: AbortSignal) => page<AdminCoupon>("/admin/coupons", params, signal),
  createCoupon: async (input: AdminCouponInput) => (await apiClient.post<Envelope<AdminCoupon>>("/admin/coupons", input)).data.data,
  updateCoupon: async (id: number, input: AdminCouponInput) => (await apiClient.put<Envelope<AdminCoupon>>(`/admin/coupons/${id}`, input)).data.data,
  deleteCoupon: async (id: number) => { await apiClient.delete(`/admin/coupons/${id}`); },

  orders: (params: QueryParams, signal?: AbortSignal) => page<OrderSummaryRow>("/admin/orders", params, signal),
  order: (id: number, signal?: AbortSignal) => get<AdminOrderDetail>(`/admin/orders/${id}`, signal),
  updateOrderStatus: async (id: number, body: { status: string; admin_note?: string; cancel_reason?: string }) =>
    (await apiClient.patch<Envelope<AdminOrderDetail>>(`/admin/orders/${id}/status`, body)).data.data,

  reviews: (params: QueryParams, signal?: AbortSignal) => page<AdminReview>("/admin/reviews", params, signal),
  moderateReview: async (id: number, isApproved: boolean) =>
    (await apiClient.patch<Envelope<AdminReview>>(`/admin/reviews/${id}`, { is_approved: isApproved })).data.data,
  deleteReview: async (id: number) => { await apiClient.delete(`/admin/reviews/${id}`); },
};
