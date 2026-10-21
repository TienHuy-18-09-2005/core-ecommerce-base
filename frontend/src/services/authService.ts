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

export interface ResetPasswordInput {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface VerifyLink {
  id: string;
  hash: string;
  expires: string;
  signature: string;
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

  /** Luôn trả cùng một thông điệp chung (server không tiết lộ email có tồn tại hay không). */
  async forgotPassword(email: string): Promise<string> {
    await ensureCsrfCookie();
    const response = await apiClient.post<Envelope<null>>("/auth/forgot-password", { email });
    return response.data.message ?? "";
  },

  async resetPassword(input: ResetPasswordInput): Promise<string> {
    await ensureCsrfCookie();
    const response = await apiClient.post<Envelope<null>>("/auth/reset-password", input);
    return response.data.message ?? "";
  },

  /** Link ký từ email: giữ nguyên thứ tự query expires → signature (server kiểm chữ ký trên URL tương đối). */
  async verifyEmail(link: VerifyLink): Promise<string> {
    const path = `/email/verify/${encodeURIComponent(link.id)}/${encodeURIComponent(link.hash)}`
      + `?expires=${encodeURIComponent(link.expires)}&signature=${encodeURIComponent(link.signature)}`;
    const response = await apiClient.get<Envelope<null>>(path);
    return response.data.message ?? "";
  },

  async resendVerification(): Promise<string> {
    await ensureCsrfCookie();
    const response = await apiClient.post<Envelope<null>>("/email/verification-notification");
    return response.data.message ?? "";
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
