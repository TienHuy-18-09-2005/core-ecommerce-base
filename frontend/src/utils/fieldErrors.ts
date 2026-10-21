import { ApiError } from "../services/apiError.ts";

/** Lấy lỗi đầu tiên của từng field từ ApiError 422. */
export function firstFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fieldErrors) {
    return {};
  }
  return Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0]]));
}

export function errorMessage(error: unknown, fallback = "Đã có lỗi xảy ra."): string | null {
  if (!error) {
    return null;
  }
  return error instanceof ApiError ? error.message : fallback;
}
