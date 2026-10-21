// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../../app/useAuth.ts";
import { ToastProvider } from "../../app/Toast.tsx";
import { EmailVerificationBanner } from "../../components/shop/EmailVerificationBanner.tsx";
import { ApiError } from "../../services/apiError.ts";
import { authService } from "../../services/authService.ts";
import type { User } from "../../types/auth.ts";
import { ForgotPasswordPage } from "./ForgotPasswordPage.tsx";
import { ResetPasswordPage } from "./ResetPasswordPage.tsx";
import { VerifyEmailPage } from "./VerifyEmailPage.tsx";

vi.mock("../../services/authService.ts", () => ({
  authService: { forgotPassword: vi.fn(), resetPassword: vi.fn(), verifyEmail: vi.fn(), resendVerification: vi.fn() },
}));

const GENERIC = "Nếu email đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.";
const unverified: User = { id: 1, name: "A", email: "a@example.com", phone: null, role: "customer", avatar_url: null, email_verified: false };

function auth(user: User | null): AuthContextValue {
  return {
    user, isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), setUser: vi.fn(),
    cartAdjustments: [], dismissCartAdjustments: vi.fn(),
  };
}

function setup(path: string, routes: { path: string; element: React.ReactNode }[], user: User | null = null) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider><AuthContext.Provider value={auth(user)}><RouterProvider router={router} /></AuthContext.Provider></ToastProvider>
    </QueryClientProvider>,
  );
  return { router, client };
}

beforeEach(() => vi.clearAllMocks());

describe("ForgotPasswordPage", () => {
  it("validates email locally, then shows the server's generic message", async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValue(GENERIC);
    setup("/quen-mat-khau", [{ path: "/quen-mat-khau", element: <ForgotPasswordPage /> }]);
    fireEvent.click(screen.getByRole("button", { name: "Gửi liên kết" }));
    expect(await screen.findByText("Email không hợp lệ.")).toBeTruthy();
    expect(authService.forgotPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: " ai@example.com " } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi liên kết" }));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", GENERIC);
    expect(authService.forgotPassword).toHaveBeenCalledWith("ai@example.com");
  });
});

describe("ResetPasswordPage", () => {
  const routes = [
    { path: "/dat-lai-mat-khau", element: <ResetPasswordPage /> },
    { path: "/dang-nhap", element: <p>Trang đăng nhập</p> },
  ];

  it("shows an invalid-link message when token/email are missing", () => {
    setup("/dat-lai-mat-khau?email=a%40example.com", routes);
    expect(screen.getByText("Liên kết không hợp lệ")).toBeTruthy();
  });

  it("enforces password rules, submits token+email from the query and goes to login", async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue("Đặt lại mật khẩu thành công.");
    const { router } = setup("/dat-lai-mat-khau?token=tok123&email=a%40example.com", routes);
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText(/tối thiểu 8 ký tự/)).toBeTruthy();
    expect(authService.resetPassword).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: "MatKhau123" } });
    fireEvent.change(screen.getByLabelText(/^Xác nhận mật khẩu mới/), { target: { value: "MatKhau123" } });
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/dang-nhap"));
    expect(authService.resetPassword).toHaveBeenCalledWith({
      token: "tok123", email: "a@example.com", password: "MatKhau123", password_confirmation: "MatKhau123",
    });
  });

  it("shows the invalid-token error with a link to request a new one", async () => {
    vi.mocked(authService.resetPassword).mockRejectedValue(new ApiError("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.", { status: 422, code: "RESET_TOKEN_INVALID" }));
    setup("/dat-lai-mat-khau?token=bad&email=a%40example.com", routes);
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: "MatKhau123" } });
    fireEvent.change(screen.getByLabelText(/^Xác nhận mật khẩu mới/), { target: { value: "MatKhau123" } });
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại mật khẩu" }));
    expect(await screen.findByText(/đã hết hạn/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Yêu cầu liên kết mới" })).toBeTruthy();
  });
});

describe("VerifyEmailPage", () => {
  const routes = [{ path: "/xac-thuc-email", element: <VerifyEmailPage /> }];

  it("passes the signed params through to the API", async () => {
    vi.mocked(authService.verifyEmail).mockResolvedValue("Xác thực email thành công.");
    setup("/xac-thuc-email?id=7&hash=abc&expires=123&signature=sig", routes);
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "Xác thực email thành công.");
    expect(authService.verifyEmail).toHaveBeenCalledWith({ id: "7", hash: "abc", expires: "123", signature: "sig" });
  });

  it("rejects incomplete links without calling the API, and shows server errors", async () => {
    setup("/xac-thuc-email?id=7&hash=abc", routes);
    expect(screen.getByRole("alert").textContent).toContain("không hợp lệ");
    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it("shows the error for a tampered/expired link", async () => {
    vi.mocked(authService.verifyEmail).mockRejectedValue(new ApiError("Liên kết xác thực không hợp lệ hoặc đã hết hạn.", { status: 403, code: "VERIFICATION_LINK_INVALID" }));
    setup("/xac-thuc-email?id=7&hash=abc&expires=1&signature=x", routes);
    expect((await screen.findByRole("alert")).textContent).toContain("đã hết hạn");
  });
});

describe("EmailVerificationBanner", () => {
  const routes = [{ path: "/", element: <EmailVerificationBanner /> }];

  it("is hidden for guests and verified users", () => {
    setup("/", routes, null);
    expect(screen.queryByRole("button", { name: "Gửi lại email" })).toBeNull();
  });

  it("lets unverified users resend the verification email", async () => {
    vi.mocked(authService.resendVerification).mockResolvedValue("Đã gửi lại email xác thực.");
    setup("/", routes, unverified);
    expect(screen.getByText(/chưa được xác thực/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại email" }));
    expect(await screen.findByText("Đã gửi lại email xác thực.")).toBeTruthy();
  });
});
