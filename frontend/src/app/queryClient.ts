import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../services/apiError.ts";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }

  return failureCount < 1;
}

/** Một QueryClient cho cả app: loader của route dùng chung để prefetch (Pha 7.5). */
export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      // Dữ liệu được coi là mới trong 2 phút: chuyển trang không gọi lại API
      staleTime: 2 * 60_000,
    },
    mutations: {
      retry: false,
    },
  },
});
