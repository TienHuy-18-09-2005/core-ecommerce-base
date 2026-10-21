import type { AuthResult, User } from "../types/auth.ts";
import { apiClient, ensureCsrfCookie, resetCsrfCookie } from "./apiClient.ts";
import { ApiError } from "./apiError.ts";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}

/** Sanctum SPA cookie: không token, không lưu gì ở trình duyệt ngoài cookie HttpOnly của server. */
export const authService = {
  /** Khôi phục phiên khi khởi động; 401 = khách (trả null, không phải lỗi). */
  async me(signal?: AbortSignal): Promise<User | null> {
    try {
      const response = await apiClient.get<Envelope<User>>("/user", { signal });
      return response.data.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return null;
      }
      throw error;
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    resetCsrfCookie();
    await ensureCsrfCookie();
    const response = await apiClient.post<Envelope<AuthResult>>("/auth/login", input);
    return response.data.data;
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    resetCsrfCookie();
    await ensureCsrfCookie();
    const response = await apiClient.post<Envelope<AuthResult>>("/auth/register", input);
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } finally {
      // Server đã regenerate CSRF token → lấy cookie mới ở lần ghi sau
      resetCsrfCookie();
    }
  },
};
