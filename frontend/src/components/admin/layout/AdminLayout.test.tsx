// @vitest-environment happy-dom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../../../app/useAuth.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../../../app/Toast.tsx";
import { adminService } from "../../../services/adminService.ts";
import { AdminLayout, SIDEBAR_KEY } from "./AdminLayout.tsx";
import { ADMIN_ROUTES, breadcrumbFor, navGroups } from "../../../pages/admin/adminRoutes.ts";

const auth = { user: { id: 1, name: "Quản trị", email: "a@x.vn", role: "admin" }, isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), setUser: vi.fn(), cartAdjustments: [], dismissCartAdjustments: vi.fn() } as unknown as AuthContextValue;

function renderLayout(path = "/admin") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth}>
        <ToastProvider><MemoryRouter initialEntries={[path]}><AdminLayout><p>nội dung</p></AdminLayout></MemoryRouter></ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(adminService, "latestOrders").mockResolvedValue({ latest_id: 10, new_count: 0, pending_count: 3 });
});

describe("adminRoutes", () => {
  it("groups nav and hides screens not built yet", () => {
    const groups = navGroups();
    expect(groups.map((g) => g.label)).toEqual(["TỔNG QUAN", "BÁN HÀNG", "CATALOG", "KHÁCH HÀNG", "HỆ THỐNG"]);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    for (const hidden of ["Thương hiệu", "Người dùng", "Nhật ký"]) expect(labels).not.toContain(hidden);
    expect(labels).toEqual(expect.arrayContaining(["Tổng quan", "Sản phẩm", "Đơn hàng", "Danh mục", "Mã giảm giá", "Đánh giá", "Cài đặt"]));
    expect(new Set(ADMIN_ROUTES.map((r) => r.path)).size).toBe(ADMIN_ROUTES.length);
  });

  it("builds breadcrumbs", () => {
    expect(breadcrumbFor("/admin").map((c) => c.label)).toEqual(["Tổng quan"]);
    expect(breadcrumbFor("/admin/don-hang").map((c) => c.label)).toEqual(["Tổng quan", "Đơn hàng"]);
    expect(breadcrumbFor("/admin/don-hang/7")).toEqual([{ label: "Tổng quan", to: "/admin" }, { label: "Đơn hàng", to: "/admin/don-hang" }, { label: "Chi tiết đơn" }]);
    expect(breadcrumbFor("/admin/don-hang/7/in").at(-1)?.label).toBe("In phiếu giao hàng");
    expect(breadcrumbFor("/admin/san-pham/moi").at(-1)?.label).toBe("Thêm sản phẩm");
    expect(breadcrumbFor("/admin/san-pham/12").at(-1)?.label).toBe("Chi tiết sản phẩm");
    expect(breadcrumbFor("/admin/nhat-ky").at(-1)?.label).toBe("Không tìm thấy");
  });
});

describe("AdminLayout", () => {
  it("shows breadcrumb with current page", () => {
    renderLayout("/admin/san-pham/5");
    const bc = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(bc).getByText("Chi tiết sản phẩm").getAttribute("aria-current")).toBe("page");
    expect(within(bc).getByRole("link", { name: "Sản phẩm" }).getAttribute("href")).toBe("/admin/san-pham");
  });

  it("nút ☰ ở đầu trang: ≥1280px thu gọn/mở rộng sidebar và ghi nhớ; không còn nút Thu gọn ở cuối menu", () => {
    const mm = vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({ matches: q.includes("80rem"), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
    const { unmount } = renderLayout();
    expect(screen.queryByText("Thu gọn")).toBeNull();
    const btn = screen.getByRole("button", { name: "Mở/Thu gọn menu" });
    expect(btn.closest("header")).toBeTruthy();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(btn);
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("1");
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();
    unmount();
    renderLayout();
    expect(screen.getByRole("button", { name: "Mở/Thu gọn menu" }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.focus(screen.getByRole("button", { name: "Mở/Thu gọn menu" }));
    return waitFor(() => expect(screen.getByRole("tooltip").textContent).toBe("Mở rộng menu")).finally(() => mm.mockRestore());
  });

  it("opens drawer, traps focus and closes on ESC", () => {
    renderLayout();
    const opener = screen.getByRole("button", { name: "Mở/Thu gọn menu" });
    expect(screen.getAllByRole("button", { name: /menu/i }).filter((b) => b.closest("header"))).toHaveLength(1);
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Menu quản trị" });
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    const close = within(dialog).getByRole("button", { name: "Đóng menu" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole("link", { name: "Cài đặt" }));
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("shows pending badge on Đơn hàng and toggles notification sound per user", async () => {
    renderLayout();
    const link = await screen.findByRole("link", { name: /3 đơn chờ xác nhận/ });
    expect(link).toBeTruthy();
    const sound = screen.getByRole("button", { name: "Âm thanh thông báo đơn mới" });
    expect(sound.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(sound);
    expect(sound.getAttribute("aria-pressed")).toBe("false");
    expect(localStorage.getItem("admin-order-sound:1")).toBe("off");
  });

  it("first visit only records the last order; later polls toast genuinely new orders once", async () => {
    renderLayout();
    await waitFor(() => expect(localStorage.getItem("admin-order-last-seen:1")).toBe("10"));
    expect(screen.queryByText(/đơn hàng mới/)).toBeNull();
  });

  it("toasts 'Có N đơn hàng mới' with a Xem action when newer orders exist", async () => {
    localStorage.setItem("admin-order-last-seen:1", "8");
    vi.mocked(adminService.latestOrders).mockResolvedValue({ latest_id: 10, new_count: 2, pending_count: 3 });
    renderLayout();
    expect(await screen.findByText("Có 2 đơn hàng mới")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Xem" })).toBeTruthy();
    expect(adminService.latestOrders).toHaveBeenCalledWith(8, expect.anything());
    expect(localStorage.getItem("admin-order-last-seen:1")).toBe("10");
  });
});
