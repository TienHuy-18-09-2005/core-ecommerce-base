// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../../../app/useAuth.ts";
import { AdminLayout, SIDEBAR_KEY } from "./AdminLayout.tsx";
import { ADMIN_ROUTES, breadcrumbFor, navGroups } from "../../../pages/admin/adminRoutes.ts";

const auth = { user: { id: 1, name: "Quản trị", email: "a@x.vn", role: "admin" }, isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), setUser: vi.fn(), cartAdjustments: [], dismissCartAdjustments: vi.fn() } as unknown as AuthContextValue;

function renderLayout(path = "/admin") {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}><AdminLayout><p>nội dung</p></AdminLayout></MemoryRouter>
    </AuthContext.Provider>,
  );
}

beforeEach(() => localStorage.clear());

describe("adminRoutes", () => {
  it("groups nav and hides screens not built yet", () => {
    const groups = navGroups();
    expect(groups.map((g) => g.label)).toEqual(["TỔNG QUAN", "BÁN HÀNG", "CATALOG", "KHÁCH HÀNG", "HỆ THỐNG"]);
    const labels = groups.flatMap((g) => g.items.map((i) => i.label));
    for (const hidden of ["Thương hiệu", "Người dùng", "Vai trò & phân quyền", "Nhật ký"]) expect(labels).not.toContain(hidden);
    expect(labels).toEqual(expect.arrayContaining(["Tổng quan", "Sản phẩm", "Đơn hàng", "Danh mục", "Mã giảm giá", "Đánh giá", "Cài đặt"]));
    expect(new Set(ADMIN_ROUTES.map((r) => r.path)).size).toBe(ADMIN_ROUTES.length);
  });

  it("builds breadcrumbs", () => {
    expect(breadcrumbFor("/admin").map((c) => c.label)).toEqual(["Tổng quan"]);
    expect(breadcrumbFor("/admin/don-hang").map((c) => c.label)).toEqual(["Tổng quan", "Đơn hàng"]);
    expect(breadcrumbFor("/admin/don-hang/7")).toEqual([{ label: "Tổng quan", to: "/admin" }, { label: "Đơn hàng", to: "/admin/don-hang" }, { label: "Chi tiết đơn" }]);
    expect(breadcrumbFor("/admin/san-pham/moi").at(-1)?.label).toBe("Thêm sản phẩm");
    expect(breadcrumbFor("/admin/san-pham/12").at(-1)?.label).toBe("Sửa sản phẩm");
    expect(breadcrumbFor("/admin/nhat-ky").at(-1)?.label).toBe("Không tìm thấy");
  });
});

describe("AdminLayout", () => {
  it("shows breadcrumb with current page", () => {
    renderLayout("/admin/san-pham/5");
    const bc = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(bc).getByText("Sửa sản phẩm").getAttribute("aria-current")).toBe("page");
    expect(within(bc).getByRole("link", { name: "Sản phẩm" }).getAttribute("href")).toBe("/admin/san-pham");
  });

  it("collapses to icon rail and remembers it", () => {
    const { unmount } = renderLayout();
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn menu" }));
    expect(localStorage.getItem(SIDEBAR_KEY)).toBe("1");
    unmount();
    renderLayout();
    expect(screen.getByRole("button", { name: "Mở rộng menu" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("opens drawer, traps focus and closes on ESC", () => {
    renderLayout();
    const opener = screen.getByRole("button", { name: "Mở menu" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Menu quản trị" });
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
});
