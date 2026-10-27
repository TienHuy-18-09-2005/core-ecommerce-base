// @vitest-environment happy-dom
import { seriousViolations } from "../../components/admin/axeTestUtils.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { AuthContext, type AuthContextValue } from "../../app/useAuth.ts";
import { AdminRoute } from "../../app/routeParts.tsx";
import { adminService } from "../../services/adminService.ts";
import { ApiError } from "../../services/apiError.ts";

vi.mock("../../services/adminService.ts", async (orig) => {
  const real = await orig<typeof import("../../services/adminService.ts")>();
  return { ...real, adminService: Object.fromEntries(Object.keys(real.adminService).map((k) => [k, vi.fn()])) };
});
vi.mock("../../services/productService.ts", () => ({ productService: { getBrands: vi.fn().mockResolvedValue([{ id: 1, name: "Rạng Đông", slug: "rang-dong" }]) } }));

const svc = vi.mocked(adminService);
const meta = { current_page: 1, last_page: 1, per_page: 20, total: 1 };

function auth(role: string): AuthContextValue {
  return {
    user: { id: 1, name: "Quản trị", email: "a@x.vn", role } as AuthContextValue["user"],
    isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), setUser: vi.fn(),
    cartAdjustments: [], dismissCartAdjustments: vi.fn(),
  };
}

function renderAdmin(path: string, role = "admin") {
  const router = createMemoryRouter([{ path: "/admin/*", element: <AdminRoute /> }, { path: "*", element: <p>khác</p> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth(role)}>
        <ToastProvider><RouterProvider router={router} /></ToastProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
  return router;
}

const order = {
  id: 7, order_code: "DH001", status: "pending", payment_method: "cod", payment_status: "unpaid",
  subtotal: 100000, discount_amount: 0, shipping_fee: 30000, total_amount: 130000, created_at: "2026-10-26T09:00:00+07:00",
  customer: { name: "Nguyễn An", phone: "0901234567", email: null }, shipping: { province: "Hà Nội", district: "Ba Đình", ward: null, address: "1 Kim Mã" },
  customer_note: null, admin_note: null, cancel_reason: null, coupon_code: null, user_id: null,
  allowed_transitions: ["confirmed", "cancelled"],
  timeline: [{ type: "created", status: "pending", label: "Đặt hàng", by: null, note: null, at: "2026-10-26T09:00:00+07:00" }],
  items: [{ product_name: "Đèn LED", variant_name: null, sku: "LED-1", unit_price: 100000, quantity: 1, line_total: 100000, thumbnail_url: null }],
} as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin panel", () => {
  it("blocks non-admin users with a Vietnamese 403 screen", async () => {
    renderAdmin("/admin", "customer");
    expect(await screen.findByRole("heading", { name: "Không có quyền truy cập" })).toBeTruthy();
    expect(svc.dashboard).not.toHaveBeenCalled();
  });

  it("renders dashboard stats and low stock", async () => {
    svc.dashboard.mockResolvedValue({
      stats: { orders_total: 12, orders_today: 3, revenue_today: 450000, revenue_14d: 900000, pending_orders: 2, low_stock_variants: 1, hidden_reviews: 4 },
      revenue_series: [{ date: "2026-10-26", orders: 3, revenue: 450000 }],
      recent_orders: [],
      low_stock: [{ variant_id: 9, product_id: 5, product_name: "Bóng đèn", variant_name: "9W", sku: "BD-9", stock_quantity: 2 }],
    });
    renderAdmin("/admin");
    expect(await screen.findByRole("heading", { name: "Tổng quan" })).toBeTruthy();
    expect((await screen.findByText("Đơn chờ xác nhận")).nextSibling?.textContent).toBe("2");
    expect(screen.getByText("9W (BD-9)")).toBeTruthy();
  });

  it("lists products with filters kept in the URL", async () => {
    svc.products.mockResolvedValue({ data: [{ id: 5, name: "Bóng đèn", slug: "bong-den", status: "published", is_featured: false, thumbnail_url: null, brand: null, categories: [], price_min: 50000, stock_total: 3, variants_count: 1, updated_at: null }], meta });
    svc.categories.mockResolvedValue([]);
    const router = renderAdmin("/admin/san-pham");
    expect(await screen.findByRole("link", { name: "Bóng đèn" })).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(screen.getByRole("group", { name: "Bộ lọc" })).getByRole("button", { name: "Trạng thái" }));
    fireEvent.change(within(screen.getByRole("dialog", { name: "Lọc theo trạng thái" })).getByLabelText("Trạng thái"), { target: { value: "draft" } });
    await waitFor(() => expect(router.state.location.search).toBe("?status=draft"));
    await waitFor(() => expect(svc.products).toHaveBeenLastCalledWith(expect.objectContaining({ status: "draft", page: 1 }), expect.anything()));
    // chip đang lọc hiện giá trị, bấm × để bỏ
    fireEvent.click(await screen.findByRole("button", { name: "Bỏ lọc trạng thái" }));
    await waitFor(() => expect(router.state.location.search).toBe(""));
    // chế độ xem có sẵn "Hàng sắp hết"
    fireEvent.click(screen.getByRole("button", { name: "Xem đã lưu" }));
    fireEvent.click(screen.getByRole("button", { name: "Hàng sắp hết" }));
    await waitFor(() => expect(router.state.location.search).toBe("?low_stock=1"));
    expect(screen.getByRole("button", { name: "Sắp hết hàng" }).getAttribute("aria-pressed")).toBe("true");
    expect(await seriousViolations()).toEqual([]);
  });

  it("sorts products by clicking column headers (asc → desc) and keeps sort in the URL", async () => {
    svc.products.mockResolvedValue({ data: [], meta });
    svc.categories.mockResolvedValue([]);
    const router = renderAdmin("/admin/san-pham?status=draft&page=2");
    const header = await screen.findByRole("columnheader", { name: /Giá từ/ });
    expect(header.getAttribute("aria-sort")).toBe("none");
    fireEvent.click(within(header).getByRole("button"));
    await waitFor(() => expect(router.state.location.search).toBe("?status=draft&sort=price_min&direction=asc"));
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(header.textContent).toContain("▲");
    await waitFor(() => expect(svc.products).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "price_min", direction: "asc", page: 1 }), expect.anything()));
    fireEvent.click(within(header).getByRole("button"));
    await waitFor(() => expect(header.getAttribute("aria-sort")).toBe("descending"));
    expect(header.textContent).toContain("▼");
    expect(router.state.location.search).toContain("direction=desc");
    // cột không sắp xếp được thì không có nút
    const actions = screen.getByRole("columnheader", { name: "Thao tác" });
    expect(within(actions).queryByRole("button")).toBeNull();
  });

  it("restores sort from the URL on orders", async () => {
    svc.orders.mockResolvedValue({ data: [], meta });
    renderAdmin("/admin/don-hang?sort=total_amount&direction=desc");
    const header = await screen.findByRole("columnheader", { name: /Tổng tiền/ });
    expect(await seriousViolations()).toEqual([]);
    expect(header.getAttribute("aria-sort")).toBe("descending");
    await waitFor(() => expect(svc.orders).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "total_amount", direction: "desc" }), expect.anything()));
  });

  it("shows the empty settings placeholder and sidebar link", async () => {
    renderAdmin("/admin/cai-dat");
    expect(await screen.findByRole("heading", { name: "Cài đặt" })).toBeTruthy();
    expect(screen.getByText(/sẽ được bổ sung/)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Cài đặt" }).length).toBeGreaterThan(0);
  });

  it("shows server validation errors on the product form", async () => {
    svc.categories.mockResolvedValue([]);
    svc.createProduct.mockRejectedValue(new ApiError("Dữ liệu không hợp lệ.", { status: 422, code: "VALIDATION_ERROR", fieldErrors: { name: ["Vui lòng nhập tên sản phẩm."], "variants.0.sku": ["Mã SKU đã tồn tại."] } }));
    renderAdmin("/admin/san-pham/moi");
    fireEvent.click(await screen.findByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("Vui lòng nhập tên sản phẩm.")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
    expect(screen.getByText("Mã SKU đã tồn tại.")).toBeTruthy();
  });

  it("changes order status using only allowed transitions", async () => {
    svc.order.mockResolvedValue(order as never);
    svc.updateOrderStatus.mockResolvedValue({ ...order, status: "confirmed" } as never);
    renderAdmin("/admin/don-hang/7");
    const select = await screen.findByLabelText("Trạng thái mới");
    expect(await seriousViolations()).toEqual([]);
    const options = within(select).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["— Chọn —", "Đã xác nhận", "Đã hủy"]);
    fireEvent.change(select, { target: { value: "confirmed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật" }));
    await waitFor(() => expect(svc.updateOrderStatus).toHaveBeenCalledWith(7, { status: "confirmed", admin_note: undefined, cancel_reason: undefined }));
  });

  it("asks for a cancel reason when cancelling", async () => {
    svc.order.mockResolvedValue(order as never);
    svc.updateOrderStatus.mockResolvedValue(order as never);
    renderAdmin("/admin/don-hang/7");
    fireEvent.change(await screen.findByLabelText("Trạng thái mới"), { target: { value: "cancelled" } });
    fireEvent.change(screen.getByLabelText("Lý do hủy"), { target: { value: "Khách đổi ý" } });
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Hủy đơn hàng?" });
    expect(document.activeElement?.textContent).toBe("Không");
    expect(svc.updateOrderStatus).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy đơn" }));
    await waitFor(() => expect(svc.updateOrderStatus).toHaveBeenCalledWith(7, { status: "cancelled", admin_note: undefined, cancel_reason: "Khách đổi ý" }));
  });

  it("hides, shows and deletes reviews; comments render as text", async () => {
    svc.reviews.mockResolvedValue({ data: [
      { id: 1, rating: 5, comment: "<img src=x onerror=alert(1)>Tốt", images: [], is_approved: true, verified_purchase: true, created_at: null, product: { id: 5, name: "Bóng đèn", slug: "bong-den" }, user: { id: 2, name: "Bình", email: "b@x.vn" } },
      { id: 2, rating: 1, comment: "Tệ", images: [], is_approved: false, verified_purchase: false, created_at: null, product: null, user: null },
    ], meta });
    svc.moderateReview.mockResolvedValue({} as never);
    svc.deleteReview.mockResolvedValue();
    renderAdmin("/admin/danh-gia");
    expect(await screen.findByText("<img src=x onerror=alert(1)>Tốt")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
    expect(document.querySelector("img[src='x']")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ẩn" }));
    await waitFor(() => expect(svc.moderateReview).toHaveBeenCalledWith(1, false));
    fireEvent.click(screen.getByRole("button", { name: "Hiện" }));
    await waitFor(() => expect(svc.moderateReview).toHaveBeenCalledWith(2, true));
    fireEvent.click(screen.getAllByRole("button", { name: "Xóa" })[0]);
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Hủy bỏ" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(svc.deleteReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Xóa" })[0]);
    fireEvent.click(within(await screen.findByRole("alertdialog", { name: "Xóa đánh giá?" })).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(svc.deleteReview).toHaveBeenCalledWith(1));
  });

  it("bulk-hides and bulk-deletes selected reviews from the bulk bar", async () => {
    svc.reviews.mockResolvedValue({ data: [
      { id: 1, rating: 5, comment: "A", images: [], is_approved: true, verified_purchase: true, created_at: null, product: null, user: { id: 2, name: "Bình", email: "b@x.vn" } },
      { id: 2, rating: 1, comment: "B", images: [], is_approved: true, verified_purchase: false, created_at: null, product: null, user: null },
      { id: 3, rating: 3, comment: "C", images: [], is_approved: true, verified_purchase: false, created_at: null, product: null, user: null },
    ], meta });
    svc.moderateReview.mockResolvedValue({} as never);
    svc.deleteReview.mockResolvedValue();
    renderAdmin("/admin/danh-gia");
    await screen.findByText("A");
    expect(screen.queryByRole("region", { name: "Thao tác hàng loạt" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Chọn đánh giá 1 của Bình"));
    fireEvent.click(screen.getByLabelText("Chọn đánh giá 3 của khách"), { shiftKey: true });
    const bar = screen.getByRole("region", { name: "Thao tác hàng loạt" });
    expect(within(bar).getByText("Đã chọn 3")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(bar).getByRole("button", { name: "Ẩn" }));
    await waitFor(() => expect(svc.moderateReview).toHaveBeenCalledTimes(3));
    expect(svc.moderateReview).toHaveBeenCalledWith(2, false);
    await waitFor(() => expect(screen.queryByRole("region", { name: "Thao tác hàng loạt" })).toBeNull());
    fireEvent.click(screen.getByLabelText("Chọn tất cả hàng trên trang"));
    fireEvent.click(within(screen.getByRole("region", { name: "Thao tác hàng loạt" })).getByRole("button", { name: "Xóa" }));
    fireEvent.click(within(await screen.findByRole("alertdialog", { name: "Xóa 3 đánh giá?" })).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(svc.deleteReview).toHaveBeenCalledTimes(3));
  });

  it("renders the category tree and shows a 409 error toast on delete", async () => {
    svc.categories.mockResolvedValue([
      { id: 2, parent_id: 1, name: "Đèn âm trần", slug: "den-am-tran", description: null, image_url: null, is_active: true, sort_order: 0, products_count: 3, children_count: 0 },
      { id: 1, parent_id: null, name: "Đèn LED", slug: "den-led", description: null, image_url: null, is_active: true, sort_order: 0, products_count: 0, children_count: 1 },
    ]);
    svc.deleteCategory.mockRejectedValue(new ApiError("Danh mục còn danh mục con hoặc sản phẩm.", { status: 409, code: "CATEGORY_IN_USE" }));
    renderAdmin("/admin/danh-muc");
    const items = await within(screen.getByRole("main")).findAllByRole("listitem");
    expect(items[0].textContent).toContain("Đèn LED");
    expect(items[1].textContent).toContain("└ Đèn âm trần");
    fireEvent.click(within(items[0]).getByRole("button", { name: "Xóa" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Xóa" }));
    expect(await screen.findByText("Danh mục còn danh mục con hoặc sản phẩm.")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
  });

  it("creates a coupon", async () => {
    svc.coupons.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.createCoupon.mockResolvedValue({} as never);
    renderAdmin("/admin/ma-giam-gia");
    fireEvent.change(await screen.findByLabelText("Mã"), { target: { value: "giam10" } });
    expect(await seriousViolations()).toEqual([]);
    fireEvent.change(screen.getByLabelText("Loại"), { target: { value: "percent" } });
    fireEvent.change(screen.getByLabelText("Giá trị"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo mã" }));
    await waitFor(() => expect(svc.createCoupon).toHaveBeenCalledWith(expect.objectContaining({ code: "giam10", type: "percent", value: 10, starts_at: null })));
  });
});
