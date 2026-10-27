// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../../app/useAuth.ts";
import { Header } from "../../components/shop/Header/Header.tsx";
import type { User } from "../../types/auth.ts";
import { LoginPage } from "./LoginPage.tsx";

vi.mock("../../services/cartService.ts", () => ({ cartService: { getCart: vi.fn().mockResolvedValue({ id: 1, user_id: null, items: [] }), addToCart: vi.fn() } }));
vi.mock("../../services/productService.ts", () => ({ productService: { getCategories: vi.fn().mockResolvedValue([]), getBrands: vi.fn(), getProducts: vi.fn(), getProductDetail: vi.fn() } }));

const mkUser = (role: string): User => ({ id: 1, name: "A", email: "a@x.vn", phone: null, role, avatar_url: null, email_verified: true } as unknown as User);

function ctx(user: User | null, loginUser?: User): AuthContextValue {
  return {
    user, isLoading: false,
    login: vi.fn().mockResolvedValue({ user: loginUser, cart_adjustments: [] }),
    register: vi.fn(), logout: vi.fn(), setUser: vi.fn(), cartAdjustments: [], dismissCartAdjustments: vi.fn(),
  };
}

function renderAt(path: string, value: AuthContextValue, el: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/dang-nhap" element={el} />
            <Route path="/" element={el} />
            <Route path="/admin" element={<p>TRANG ADMIN</p>} />
            <Route path="/gio-hang" element={<p>TRANG GIỎ</p>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe("Lối vào trang quản trị", () => {
  it("chỉ admin thấy link Trang quản trị", () => {
    const { unmount } = renderAt("/", ctx(mkUser("admin")), <Header />);
    expect(screen.getByRole("link", { name: /Trang quản trị/ }).getAttribute("href")).toBe("/admin");
    unmount();
    renderAt("/", ctx(mkUser("customer")), <Header />);
    expect(screen.queryByRole("link", { name: /Trang quản trị/ })).toBeNull();
  });

  async function login(path: string, role: string) {
    renderAt(path, ctx(null, mkUser(role)), <LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email/), { target: { value: "a@x.vn" } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: "secret123" } });
    fireEvent.submit(screen.getByRole("button", { name: /Đăng nhập/ }).closest("form")!);
  }

  it("admin đăng nhập không có redirect → /admin", async () => {
    await login("/dang-nhap", "admin");
    await waitFor(() => expect(screen.getByText("TRANG ADMIN")).toBeTruthy());
  });

  it("admin có ?redirect= thì tôn trọng redirect", async () => {
    await login("/dang-nhap?redirect=%2Fgio-hang", "admin");
    await waitFor(() => expect(screen.getByText("TRANG GIỎ")).toBeTruthy());
  });

  it("khách hàng thường không bị chuyển vào /admin", async () => {
    await login("/dang-nhap?redirect=%2Fgio-hang", "customer");
    await waitFor(() => expect(screen.getByText("TRANG GIỎ")).toBeTruthy());
  });
});
