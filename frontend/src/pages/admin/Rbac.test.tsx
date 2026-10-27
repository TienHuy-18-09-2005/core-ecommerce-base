// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { AuthContext, type AuthContextValue } from "../../app/useAuth.ts";
import { AdminRoute } from "../../app/routeParts.tsx";
import { adminService } from "../../services/adminService.ts";
import { canEnterAdmin, userCan } from "../../hooks/useCan.ts";
import { navGroups } from "./adminRoutes.ts";
import { seriousViolations } from "../../components/admin/axeTestUtils.ts";
import type { User } from "../../types/auth.ts";

vi.mock("../../services/adminService.ts", async (orig) => {
  const real = await orig<typeof import("../../services/adminService.ts")>();
  return { ...real, adminService: Object.fromEntries(Object.keys(real.adminService).map((k) => [k, vi.fn()])) };
});
vi.mock("../../services/productService.ts", () => ({ productService: { getBrands: vi.fn().mockResolvedValue([]) } }));

const svc = vi.mocked(adminService);
const meta = { current_page: 1, last_page: 1, per_page: 20, total: 1 };

const ALL = ["dashboard.view", "revenue.view", "products.view", "products.edit", "products.delete", "categories.view", "categories.manage",
  "orders.view", "orders.update", "orders.cancel", "orders.note", "orders.print", "coupons.view", "coupons.manage", "reviews.view", "reviews.moderate",
  "audit.view", "roles.manage", "settings.manage"];
const CSKH = ["dashboard.view", "products.view", "orders.view", "orders.note", "coupons.view", "reviews.view", "reviews.moderate"];
const ACCOUNTANT = ["dashboard.view", "revenue.view", "products.view", "orders.view", "orders.print", "coupons.view"];

const user = (role: string, permissions?: string[]): User => ({ id: 1, name: "Nhân viên", email: "s@x.vn", phone: null, role, avatar_url: null, email_verified: true, permissions });

function renderAdmin(path: string, u: User) {
  const router = createMemoryRouter([{ path: "/admin/*", element: <AdminRoute /> }, { path: "*", element: <p>khác</p> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const value: AuthContextValue = { user: u, isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), setUser: vi.fn(), cartAdjustments: [], dismissCartAdjustments: vi.fn() };
  const view = render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={value}><ToastProvider><RouterProvider router={router} /></ToastProvider></AuthContext.Provider>
    </QueryClientProvider>,
  );
  return { router, view };
}

const catalog = [
  { id: "products", label: "Sản phẩm", items: [{ key: "products.view", label: "Xem sản phẩm", admin_only: false }, { key: "products.edit", label: "Sửa sản phẩm", admin_only: false }] },
  { id: "system", label: "Hệ thống", items: [{ key: "audit.view", label: "Xem nhật ký", admin_only: false }, { key: "roles.manage", label: "Quản lý vai trò", admin_only: true }] },
];
const role = { id: 3, slug: "customer_care", name: "Chăm sóc khách hàng", description: "Ghi chú & điều phối", is_system: true, permissions: ["products.view"], users_count: 2, updated_at: null };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  svc.latestOrders.mockResolvedValue({ latest_id: 7, new_count: 0, pending_count: 1 });
  svc.orderStatusCounts.mockResolvedValue({ all: 0, pending: 0, confirmed: 0, packing: 0, shipping: 0, delivered: 0, cancelled: 0, returned: 0 });
  svc.permissionCatalog.mockResolvedValue(catalog);
  svc.roles.mockResolvedValue([role]);
});

describe("useCan helpers", () => {
  it("checks permissions and admin-area entry", () => {
    expect(userCan(user("staff", CSKH), "orders.note")).toBe(true);
    expect(userCan(user("staff", CSKH), "orders.cancel")).toBe(false);
    expect(userCan(user("admin"), "roles.manage")).toBe(true); // phiên cũ chưa có permissions
    expect(userCan(null, "products.view")).toBe(false);
    expect(canEnterAdmin(user("staff", CSKH))).toBe(true);
    expect(canEnterAdmin(user("staff", []))).toBe(false);
    expect(canEnterAdmin(user("customer", []))).toBe(false);
  });

  it("filters sidebar groups by permission", () => {
    const labels = navGroups(undefined, (p) => !p || CSKH.includes(p)).flatMap((g) => g.items.map((i) => i.label));
    expect(labels).toEqual(["Tổng quan", "Đơn hàng", "Mã giảm giá", "Sản phẩm", "Đánh giá", "Cài đặt"]);
    const all = navGroups(undefined, (p) => !p || ALL.includes(p)).flatMap((g) => g.items.map((i) => i.label));
    expect(all).toContain("Vai trò & phân quyền");
    expect(all).toContain("Cài đặt");
  });
});

describe("admin RBAC UI", () => {
  it("lets staff with roles in and hides menu items they cannot use", async () => {
    svc.dashboard.mockResolvedValue({ stats: { orders_total: 1, orders_today: 1, pending_orders: 0, low_stock_variants: 0, hidden_reviews: 0 }, revenue_series: [{ date: "2026-10-26", orders: 1 }], recent_orders: [], low_stock: [] });
    renderAdmin("/admin", user("staff", CSKH));
    expect(await screen.findByRole("heading", { name: "Tổng quan" })).toBeTruthy();
    const nav = screen.getAllByRole("navigation", { name: "Menu quản trị" })[0];
    expect(within(nav).queryByText("Vai trò & phân quyền")).toBeNull();
    expect(within(nav).queryByText("Danh mục")).toBeNull();
    expect(within(nav).getByText("Đơn hàng")).toBeTruthy();
    // Không có revenue.view → server bỏ trường doanh thu, UI ẩn widget.
    await screen.findByText("Đơn hôm nay");
    expect(screen.queryByText("Doanh thu hôm nay")).toBeNull();
    expect(screen.queryByText(/Doanh thu 14 ngày/)).toBeNull();
  });

  it("shows revenue widgets to the accountant", async () => {
    svc.dashboard.mockResolvedValue({ stats: { orders_total: 1, orders_today: 1, revenue_today: 450000, revenue_14d: 900000, pending_orders: 0, low_stock_variants: 0, hidden_reviews: 0 }, revenue_series: [{ date: "2026-10-26", orders: 1, revenue: 450000 }], recent_orders: [], low_stock: [] });
    renderAdmin("/admin", user("staff", ACCOUNTANT));
    expect(await screen.findByText("Doanh thu hôm nay")).toBeTruthy();
  });

  it("renders a 403 page for a route without permission", async () => {
    renderAdmin("/admin/vai-tro", user("staff", CSKH));
    expect(await screen.findByRole("heading", { name: "Bạn không có quyền xem trang này" })).toBeTruthy();
    expect(svc.roles).not.toHaveBeenCalled();
  });

  it("blocks staff without any role from the admin area", async () => {
    renderAdmin("/admin", user("staff", []));
    expect(await screen.findByRole("heading", { name: "Không có quyền truy cập" })).toBeTruthy();
  });

  it("redirects from the dashboard to the first allowed screen", async () => {
    svc.reviews.mockResolvedValue({ data: [], meta });
    const { router } = renderAdmin("/admin", user("staff", ["reviews.view"]));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/danh-gia"));
  });

  it("hides product actions without edit/delete permissions", async () => {
    svc.products.mockResolvedValue({ data: [{ id: 5, name: "Đèn LED", slug: "den", sku: "D1", status: "published", thumbnail_url: null, brand: null, categories: [], price_min: 1, price_max: 1, stock_total: 9, variants_count: 1, updated_at: null }], meta } as never);
    svc.categories.mockResolvedValue([]);
    renderAdmin("/admin/san-pham", user("staff", CSKH));
    expect(await screen.findByText("Đèn LED")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Xem chi tiết Đèn LED" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sửa Đèn LED" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xóa Đèn LED" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nhân bản Đèn LED" })).toBeNull();
    expect(screen.queryByText("+ Thêm sản phẩm")).toBeNull();
  });

  it("CSKH can add notes but not cancel or advance an order", async () => {
    svc.order.mockResolvedValue({
      id: 7, order_code: "DH001", status: "pending", payment_method: "cod", payment_status: "unpaid", subtotal: 1, discount_amount: 0, shipping_fee: 0, total_amount: 1,
      created_at: "2026-10-26T09:00:00+07:00", customer: { name: "An", phone: "0901", email: null }, shipping: { province: "HN", district: "BĐ", ward: null, address: "1" },
      customer_note: null, admin_note: null, cancel_reason: null, coupon_code: null, user_id: null, allowed_transitions: ["confirmed", "cancelled"],
      timeline: [], notes: [], items: [],
    } as never);
    renderAdmin("/admin/don-hang/7", user("staff", CSKH));
    expect(await screen.findByRole("heading", { name: "Đơn DH001" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hủy đơn" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Xác nhận đơn" })).toBeNull();
    expect(screen.queryByRole("link", { name: /In phiếu/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Lưu ghi chú" })).toBeTruthy();
  });

  it("lists roles and saves grouped permission checkboxes", async () => {
    svc.updateRole.mockResolvedValue({ ...role, permissions: ["products.view", "products.edit", "audit.view"] });
    renderAdmin("/admin/vai-tro", user("admin", ALL));
    expect(await screen.findByText("Chăm sóc khách hàng")).toBeTruthy();
    expect(await screen.findByText("1/3 quyền")).toBeTruthy();
    // Vai trò đang có nhân viên → nút xóa bị khóa
    expect(screen.getByRole("button", { name: "Xóa vai trò Chăm sóc khách hàng" }).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Sửa vai trò Chăm sóc khách hàng" }));
    const dialog = await screen.findByRole("dialog");
    expect((within(dialog).getByLabelText("Quản lý vai trò") as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(within(dialog).getByLabelText("Chọn tất cả quyền nhóm Sản phẩm"));
    fireEvent.click(within(dialog).getByLabelText("Xem nhật ký"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(svc.updateRole).toHaveBeenCalledWith(3, { name: "Chăm sóc khách hàng", description: "Ghi chú & điều phối", permissions: ["products.view", "products.edit", "audit.view"] }));
    expect(await seriousViolations()).toEqual([]);
  });

  it("assigns several roles to a staff member", async () => {
    svc.roles.mockResolvedValue([role, { ...role, id: 4, slug: "accountant", name: "Kế toán", users_count: 0 }]);
    svc.staff.mockResolvedValue({ data: [
      { id: 9, name: "Bình", email: "b@x.vn", role: "staff", is_active: true, roles: [{ id: 3, name: "Chăm sóc khách hàng" }] },
      { id: 1, name: "Quản trị", email: "a@x.vn", role: "admin", is_active: true, roles: [] },
    ], meta });
    svc.updateStaffRoles.mockResolvedValue({ id: 9, name: "Bình", email: "b@x.vn", role: "staff", is_active: true, roles: [] });
    renderAdmin("/admin/vai-tro", user("admin", ALL));
    fireEvent.click(await screen.findByRole("tab", { name: "Nhân viên" }));
    expect(await screen.findByText("Bình")).toBeTruthy();
    expect(screen.getByText("Quản trị viên · toàn quyền")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gán vai trò cho Bình" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Kế toán"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(svc.updateStaffRoles).toHaveBeenCalledWith(9, [3, 4]));
  });

  it("adds a new staff member by email", async () => {
    svc.staff.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.addStaff.mockResolvedValue({ id: 10, name: "Chi", email: "c@x.vn", role: "staff", is_active: true, roles: [] });
    renderAdmin("/admin/vai-tro", user("admin", ALL));
    fireEvent.click(await screen.findByRole("tab", { name: "Nhân viên" }));
    fireEvent.click(await screen.findByRole("button", { name: "Thêm nhân viên" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Email tài khoản/), { target: { value: " c@x.vn " } });
    fireEvent.click(within(dialog).getByLabelText("Chăm sóc khách hàng"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Thêm nhân viên" }));
    await waitFor(() => expect(svc.addStaff).toHaveBeenCalledWith("c@x.vn", [3]));
  });
});
