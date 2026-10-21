// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { AuthContext, type AuthContextValue } from "../../app/useAuth.ts";
import { ApiError } from "../../services/apiError.ts";
import { accountService } from "../../services/accountService.ts";
import { AccountPage } from "./AccountPage.tsx";

vi.mock("../../services/accountService.ts", () => ({
  accountService: {
    updateProfile: vi.fn(), changePassword: vi.fn(), orders: vi.fn(),
    addresses: vi.fn(), createAddress: vi.fn(), updateAddress: vi.fn(), deleteAddress: vi.fn(),
  },
}));

const auth = {
  user: { id: 1, name: "Khách A", email: "a@example.com", phone: null, role: "customer", avatar_url: null },
  isLoading: false, setUser: vi.fn(), cartAdjustments: [], dismissCartAdjustments: vi.fn(),
} as unknown as AuthContextValue;

function setup(url: string) {
  const router = createMemoryRouter([{ path: "/tai-khoan", element: <AccountPage /> }], { initialEntries: [url] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><AuthContext.Provider value={auth}><RouterProvider router={router} /></AuthContext.Provider></ToastProvider></QueryClientProvider>);
  return router;
}

describe("AccountPage", () => {
  it("keeps the active tab in the URL and lists own orders", async () => {
    vi.mocked(accountService.orders).mockResolvedValue({
      data: [{ order_code: "ORD-1", status: "shipping", total_amount: 130000, created_at: "2026-10-21T01:00:00Z" } as never],
      meta: { current_page: 1, last_page: 1, per_page: 10, total: 1 },
    });
    const router = setup("/tai-khoan");
    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử đơn hàng" }));
    expect(router.state.location.search).toBe("?tab=don-hang");
    expect((await screen.findByRole("link", { name: "ORD-1" })).getAttribute("href")).toBe("/tai-khoan/don-hang/ORD-1");
    expect(screen.getByText("Đang giao")).toBeTruthy();
  });

  it("validates the address form before calling the API", async () => {
    vi.mocked(accountService.addresses).mockResolvedValue([]);
    setup("/tai-khoan?tab=dia-chi");
    fireEvent.click(await screen.findByRole("button", { name: "+ Thêm địa chỉ" }));
    fireEvent.change(screen.getByLabelText("Số điện thoại"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu địa chỉ" }));
    expect(await screen.findByText("Số điện thoại không hợp lệ.")).toBeTruthy();
    expect(accountService.createAddress).not.toHaveBeenCalled();
  });

  it("shows the wrong-current-password error from the server", async () => {
    vi.mocked(accountService.changePassword).mockRejectedValue(new ApiError("Mật khẩu hiện tại không đúng.", { status: 422, code: "WRONG_PASSWORD" }));
    setup("/tai-khoan?tab=mat-khau");
    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), { target: { value: "sai" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), { target: { value: "Moi123456" } });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu mới"), { target: { value: "Moi123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Mật khẩu hiện tại không đúng."));
  });
});
