// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../components/common/ProtectedRoute.tsx";
import { CartAdjustmentNotice } from "../components/shop/CartAdjustmentNotice.tsx";
import { OrderTimeline } from "../components/shop/order/OrderTimeline.tsx";
import { LoginPage } from "../pages/shop/LoginPage.tsx";
import { ApiError } from "../services/apiError.ts";
import { authService } from "../services/authService.ts";
import { describeAdjustment, safeRedirect, type User } from "../types/auth.ts";
import type { Order } from "../types/order.ts";
import { validateNewPassword, validateRegister } from "../utils/authValidation.ts";
import { AuthProvider } from "./AuthProvider.tsx";
import { ToastProvider } from "./Toast.tsx";
import { useAuth } from "./useAuth.ts";

vi.mock("../services/authService.ts", () => ({
  authService: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));
vi.mock("../services/cartService.ts", () => ({ cartService: { getCart: vi.fn().mockResolvedValue({ id: 1, user_id: null, items: [] }) } }));

const user: User = { id: 1, name: "Khách A", email: "a@example.com", phone: null, role: "customer", avatar_url: null, email_verified: true };

function Who() {
  const { user: u, isLoading } = useAuth();
  return <p data-testid="who">{isLoading ? "loading" : u ? u.name : "guest"}</p>;
}

function Failing401() {
  useQuery({ queryKey: ["orders", "x"], queryFn: () => Promise.reject(new ApiError("x", { status: 401, code: "UNAUTHENTICATED" })), retry: false });
  return null;
}

function setup(path: string, routes: { path: string; element: React.ReactNode }[]) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ToastProvider>
    </QueryClientProvider>,
  );
  return { router, client };
}

beforeEach(() => {
  vi.mocked(authService.me).mockReset();
  vi.mocked(authService.login).mockReset();
  vi.mocked(authService.logout).mockReset().mockResolvedValue();
});

describe("auth helpers", () => {
  it("only allows internal redirects", () => {
    expect(safeRedirect("/tai-khoan?tab=don-hang")).toBe("/tai-khoan?tab=don-hang");
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "", null]) {
      expect(safeRedirect(bad)).toBe("/");
    }
  });

  it("describes merge adjustments", () => {
    expect(describeAdjustment({ product_variant_id: 1, product_name: "Đèn", requested: 4, quantity: 3, reason: "INSUFFICIENT_STOCK" })).toContain("chỉ còn 3");
    expect(describeAdjustment({ product_variant_id: 1, product_name: "Đèn", requested: 1, quantity: 0, reason: "UNAVAILABLE" })).toContain("ngừng bán");
  });

  it("validates register and new password", () => {
    const e = validateRegister({ name: "", email: "x", phone: "1", password: "abc", password_confirmation: "abd" });
    expect(Object.keys(e).sort()).toEqual(["email", "name", "password", "password_confirmation", "phone"]);
    expect(validateNewPassword("Abcdefg1", "Abcdefg1")).toEqual({});
  });
});

describe("AuthProvider + LoginPage", () => {
  it("restores the session from /api/user on start", async () => {
    vi.mocked(authService.me).mockResolvedValue(user);
    setup("/", [{ path: "/", element: <Who /> }]);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Khách A"));
  });

  it("logs in, redirects to the safe target and shows cart merge adjustments", async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    vi.mocked(authService.login).mockResolvedValue({
      user,
      cart_adjustments: [{ product_variant_id: 9, product_name: "Ổ cắm", requested: 5, quantity: 2, reason: "INSUFFICIENT_STOCK" }],
    });
    const { router } = setup("/dang-nhap?redirect=%2Fthanh-toan", [
      { path: "/dang-nhap", element: <LoginPage /> },
      { path: "/thanh-toan", element: <><CartAdjustmentNotice /><Who /></> },
    ]);

    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "Secret123" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/thanh-toan"));
    expect(authService.login).toHaveBeenCalledWith({ email: "a@example.com", password: "Secret123", remember: true });
    expect(screen.getByText(/Ổ cắm: chỉ còn 2 trong kho/)).toBeTruthy();
    expect(screen.getByTestId("who").textContent).toBe("Khách A");
  });

  it("shows the server's generic credentials error", async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    vi.mocked(authService.login).mockRejectedValue(new ApiError("Email hoặc mật khẩu không đúng.", { status: 422, code: "INVALID_CREDENTIALS" }));
    setup("/dang-nhap", [{ path: "/dang-nhap", element: <LoginPage /> }]);
    fireEvent.change(await screen.findByLabelText("Email"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), { target: { value: "sai" } });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(await screen.findByText("Email hoặc mật khẩu không đúng.")).toBeTruthy();
  });

  it("ProtectedRoute sends guests to login with a redirect back", async () => {
    vi.mocked(authService.me).mockResolvedValue(null);
    const { router } = setup("/tai-khoan?tab=don-hang", [
      { path: "/tai-khoan", element: <ProtectedRoute><p>Bí mật</p></ProtectedRoute> },
      { path: "/dang-nhap", element: <p>Trang đăng nhập</p> },
    ]);
    await screen.findByText("Trang đăng nhập");
    expect(router.state.location.search).toBe(`?redirect=${encodeURIComponent("/tai-khoan?tab=don-hang")}`);
    expect(screen.queryByText("Bí mật")).toBeNull();
  });

  it("logout in another tab turns this tab into a guest", async () => {
    vi.mocked(authService.me).mockResolvedValue(user);
    setup("/", [{ path: "/", element: <Who /> }]);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Khách A"));

    const otherTab = new BroadcastChannel("auth");
    otherTab.postMessage({ type: "logout" });
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));
    otherTab.close();
  });

  it("a 401 from any query signs the user out", async () => {
    vi.mocked(authService.me).mockResolvedValue(user);
    const { router } = setup("/", [{ path: "/", element: <Who /> }, { path: "/x", element: <><Who /><Failing401 /></> }]);
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("Khách A"));
    await router.navigate("/x");
    await waitFor(() => expect(screen.getByTestId("who").textContent).toBe("guest"));
  });
});

describe("OrderTimeline", () => {
  const base = { order_code: "O", created_at: "2026-10-21T01:00:00Z", items: [] } as unknown as Order;

  it("marks reached steps and the current one", () => {
    render(<OrderTimeline order={{ ...base, status: "packing" }} />);
    const steps = screen.getAllByRole("listitem");
    expect(steps.map((s) => s.getAttribute("data-done"))).toEqual(["true", "true", "true", "false", "false"]);
    expect(steps[2].getAttribute("aria-current")).toBe("step");
  });

  it("shows the cancelled branch", () => {
    render(<OrderTimeline order={{ ...base, status: "cancelled" }} />);
    expect(screen.getByRole("status").textContent).toContain("đã hủy");
  });
});
