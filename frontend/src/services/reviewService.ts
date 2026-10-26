import type { Review, ReviewEligibility, ReviewInput, ReviewListResponse } from "../types/review.ts";
import { apiClient } from "./apiClient.ts";

export interface ReviewListParams {
  page?: number;
  rating?: number | null;
}

/** Ràng buộc giống server: JPEG/PNG/WebP, ≤ 2MB, tối đa 3 ảnh (không nhận SVG). */
export const REVIEW_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const REVIEW_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const REVIEW_MAX_IMAGES = 3;
export const REVIEW_COMMENT_MAX = 2000;

function toFormData(input: ReviewInput): FormData {
  const form = new FormData();
  form.append("rating", String(input.rating));
  form.append("comment", input.comment);
  input.images.forEach((file) => form.append("images[]", file));
  input.keepImages?.forEach((url) => form.append("keep_images[]", url));
  return form;
}

type Envelope<T> = { success: boolean; data: T };

export const reviewService = {
  async list(slug: string, params: ReviewListParams = {}, signal?: AbortSignal): Promise<ReviewListResponse> {
    const response = await apiClient.get<Envelope<ReviewListResponse>>(`/products/${encodeURIComponent(slug)}/reviews`, {
      params: { page: params.page ?? 1, rating: params.rating ?? undefined },
      signal,
    });
    return response.data.data;
  },

  async eligibility(slug: string, signal?: AbortSignal): Promise<ReviewEligibility> {
    const response = await apiClient.get<Envelope<ReviewEligibility>>(`/products/${encodeURIComponent(slug)}/reviews/eligibility`, { signal });
    return response.data.data;
  },

  async create(slug: string, input: ReviewInput): Promise<Review> {
    const response = await apiClient.post<Envelope<Review>>(`/products/${encodeURIComponent(slug)}/reviews`, toFormData(input));
    return response.data.data;
  },

  /** PHP không đọc multipart của PUT → gửi POST kèm _method=PUT. */
  async update(id: number, input: ReviewInput): Promise<Review> {
    const form = toFormData(input);
    form.append("_method", "PUT");
    const response = await apiClient.post<Envelope<Review>>(`/reviews/${id}`, form);
    return response.data.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/reviews/${id}`);
  },
};

/** Kiểm tra phía client (server vẫn kiểm lại). Trả về thông báo lỗi hoặc null. */
export function validateReviewImages(files: File[], existing = 0): string | null {
  if (files.length + existing > REVIEW_MAX_IMAGES) {
    return `Tối đa ${REVIEW_MAX_IMAGES} ảnh cho mỗi đánh giá.`;
  }
  for (const file of files) {
    if (!(REVIEW_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      return `Ảnh "${file.name}" không hợp lệ. Chỉ nhận JPEG, PNG hoặc WebP.`;
    }
    if (file.size > REVIEW_IMAGE_MAX_BYTES) {
      return `Ảnh "${file.name}" vượt quá 2MB.`;
    }
  }
  return null;
}
