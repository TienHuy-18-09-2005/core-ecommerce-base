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

function auth(role: string, permissions?: string[]): AuthContextValue {
  return {
    user: { id: 1, name: "Quản trị", email: "a@x.vn", role, ...(permissions ? { permissions } : {}) } as AuthContextValue["user"],
    isLoading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), setUser: vi.fn(),
    cartAdjustments: [], dismissCartAdjustments: vi.fn(),
  };
}

function renderAdmin(path: string, role = "admin", permissions?: string[]) {
  const router = createMemoryRouter([{ path: "/admin/*", element: <AdminRoute /> }, { path: "*", element: <p>khác</p> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={auth(role, permissions)}>
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
  timeline: [{ type: "created", status: "pending", from: null, label: "Đặt hàng", by: null, note: null, backfilled: false, at: "2026-10-26T09:00:00+07:00" }],
  notes: [] as { id: number; body: string; by: string | null; at: string | null }[],
  items: [{ product_name: "Đèn LED", variant_name: null, sku: "LED-1", unit_price: 100000, quantity: 1, line_total: 100000, thumbnail_url: null }],
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  svc.latestOrders.mockResolvedValue({ latest_id: 7, new_count: 0, pending_count: 1 });
  svc.orderStatusCounts.mockResolvedValue({ all: 3, pending: 1, confirmed: 1, packing: 0, shipping: 1, delivered: 0, cancelled: 0, returned: 0 });
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
    svc.products.mockResolvedValue({ data: [{ id: 5, name: "Bóng đèn", slug: "bong-den", status: "published", is_featured: false, thumbnail_url: null, brand: null, categories: [], price_min: 50000, price_max: 50000, sku: "BD-01", stock_total: 3, variants_count: 1, updated_at: null }], meta });
    svc.categories.mockResolvedValue([]);
    const router = renderAdmin("/admin/san-pham");
    expect(await screen.findByRole("link", { name: "Bóng đèn" })).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
    // bộ lọc hiện sẵn, chọn là áp dụng ngay
    const bar = screen.getByRole("group", { name: "Bộ lọc" });
    expect(screen.queryByRole("button", { name: "Xóa bộ lọc" })).toBeNull();
    fireEvent.change(within(bar).getByLabelText("Trạng thái"), { target: { value: "draft" } });
    await waitFor(() => expect(router.state.location.search).toBe("?status=draft"));
    await waitFor(() => expect(svc.products).toHaveBeenLastCalledWith(expect.objectContaining({ status: "draft", page: 1 }), expect.anything()));
    expect((within(bar).getByLabelText("Trạng thái") as HTMLSelectElement).value).toBe("draft");
    fireEvent.click(await screen.findByRole("button", { name: "Xóa bộ lọc" }));
    await waitFor(() => expect(router.state.location.search).toBe(""));
    // chế độ xem có sẵn "Hàng sắp hết"
    fireEvent.click(screen.getByRole("button", { name: "Xem đã lưu" }));
    fireEvent.click(screen.getByRole("button", { name: "Hàng sắp hết" }));
    await waitFor(() => expect(router.state.location.search).toBe("?low_stock=1"));
    expect((screen.getByRole("checkbox", { name: "Sắp hết hàng" }) as HTMLInputElement).checked).toBe(true);
    expect(await seriousViolations()).toEqual([]);
  });

  it("sorts products by clicking column headers (asc → desc) and keeps sort in the URL", async () => {
    svc.products.mockResolvedValue({ data: [], meta });
    svc.categories.mockResolvedValue([]);
    const router = renderAdmin("/admin/san-pham?status=draft&page=2");
    const header = await screen.findByRole("columnheader", { name: /^Giá/ });
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

  const settings = { store_name: "Đồ Điện Siêu Xịn", store_phone: "028 1234 5678", store_address: "1 Lê Lợi", store_email: "", shipping_fee: 30000, free_shipping_threshold: 0 };
  const settingsData = { ...settings, defaults: settings };

  it("R7: admin edits shipping settings with Ctrl+S and sees a toast", async () => {
    svc.settings.mockResolvedValue(settingsData);
    svc.updateSettings.mockResolvedValue({ ...settingsData, free_shipping_threshold: 500000 });
    renderAdmin("/admin/cai-dat?tab=shipping");
    expect(await screen.findByRole("heading", { name: "Cài đặt" })).toBeTruthy();
    const input = await screen.findByLabelText(/Ngưỡng miễn phí/);
    expect(screen.getAllByRole("link", { name: "Cài đặt" }).length).toBeGreaterThan(0);
    fireEvent.change(input, { target: { value: "500000" } });
    expect(screen.getByText(/được miễn phí vận chuyển/)).toBeTruthy();
    fireEvent.keyDown(input, { key: "s", ctrlKey: true });
    await waitFor(() => expect(svc.updateSettings.mock.calls[0]?.[0]).toEqual({ shipping_fee: 30000, free_shipping_threshold: 500000 }));
    expect(await screen.findByText("Đã lưu cài đặt.")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
  });

  it("R7: store info shows server validation errors", async () => {
    svc.settings.mockResolvedValue(settingsData);
    svc.updateSettings.mockRejectedValue(new ApiError("Dữ liệu không hợp lệ.", { status: 422, code: "VALIDATION_ERROR", fieldErrors: { store_phone: ["Số điện thoại không hợp lệ."] } }));
    renderAdmin("/admin/cai-dat");
    const phone = await screen.findByLabelText(/Số điện thoại/);
    fireEvent.change(phone, { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    expect(await screen.findByText("Số điện thoại không hợp lệ.")).toBeTruthy();
  });

  it("R7: settings.view is read-only; staff without it only sees the account tab", async () => {
    svc.settings.mockResolvedValue(settingsData);
    renderAdmin("/admin/cai-dat", "staff", ["settings.view"]);
    const name = await screen.findByLabelText(/Tên cửa hàng/);
    expect((name.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Lưu thay đổi" })).toBeNull();
    expect(screen.getByText(/chỉ có quyền xem/)).toBeTruthy();
  });

  it("R7: staff without settings permission gets only the password tab", async () => {
    renderAdmin("/admin/cai-dat", "staff", ["orders.view"]);
    expect(await screen.findByRole("heading", { name: "Đổi mật khẩu" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Thông tin cửa hàng/ })).toBeNull();
    expect(svc.settings).not.toHaveBeenCalled();
  });

  it("R7: password change validates locally and maps WRONG_PASSWORD", async () => {
    renderAdmin("/admin/cai-dat?tab=account");
    const cur = await screen.findByLabelText(/Mật khẩu hiện tại/);
    const pw = screen.getByLabelText(/^Mật khẩu mới/);
    const confirm = screen.getByLabelText(/Nhập lại mật khẩu mới/);
    fireEvent.change(pw, { target: { value: "yeu" } });
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(await screen.findByText("Mật khẩu mới chưa đủ mạnh.")).toBeTruthy();
    expect(screen.getByText("Vui lòng nhập mật khẩu hiện tại.")).toBeTruthy();
    expect(svc.changePassword).not.toHaveBeenCalled();

    svc.changePassword.mockRejectedValue(new ApiError("Mật khẩu hiện tại không đúng.", { status: 422, code: "WRONG_PASSWORD" }));
    fireEvent.change(cur, { target: { value: "sai-roi" } });
    fireEvent.change(pw, { target: { value: "Manh-Hon-123" } });
    fireEvent.change(confirm, { target: { value: "Manh-Hon-123" } });
    expect(screen.getByRole("list", { name: "Yêu cầu mật khẩu" }).textContent).toContain("Ít nhất 10 ký tự: đạt");
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    await waitFor(() => expect(svc.changePassword.mock.calls[0]?.[0]).toEqual({ current_password: "sai-roi", password: "Manh-Hon-123", password_confirmation: "Manh-Hon-123" }));
    expect((await screen.findAllByText("Mật khẩu hiện tại không đúng.")).length).toBeGreaterThan(0);

    svc.changePassword.mockResolvedValue("Đã đổi mật khẩu.");
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
    expect(await screen.findByText("Đã đổi mật khẩu.")).toBeTruthy();
    await waitFor(() => expect((cur as HTMLInputElement).value).toBe(""));
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

  it("confirms an order with the next-step primary button and shows the timeline", async () => {
    svc.order.mockResolvedValue(order as never);
    svc.updateOrderStatus.mockResolvedValue({ ...order, status: "confirmed" } as never);
    renderAdmin("/admin/don-hang/7");
    const primary = await screen.findByRole("button", { name: "Xác nhận đơn" });
    expect(await seriousViolations()).toEqual([]);
    expect(screen.getByText("Đặt hàng")).toBeTruthy();
    expect(screen.getByText("Đã giao")).toBeTruthy(); // bước sắp tới
    expect(screen.getByRole("link", { name: "In phiếu" }).getAttribute("href")).toBe("/admin/don-hang/7/in");
    fireEvent.click(primary);
    await waitFor(() => expect(svc.updateOrderStatus).toHaveBeenCalledWith(7, { status: "confirmed", cancel_reason: undefined }));
  });

  it("requires a cancel reason in a modal when cancelling", async () => {
    svc.order.mockResolvedValue(order as never);
    svc.updateOrderStatus.mockResolvedValue(order as never);
    renderAdmin("/admin/don-hang/7");
    fireEvent.click(await screen.findByRole("button", { name: "Hủy đơn" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Hủy đơn hàng?" });
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy đơn" }));
    expect(await within(dialog).findByText("Vui lòng nhập lý do hủy (ít nhất 3 ký tự).")).toBeTruthy();
    expect(svc.updateOrderStatus).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hết hàng" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy đơn" }));
    await waitFor(() => expect(svc.updateOrderStatus).toHaveBeenCalledWith(7, { status: "cancelled", cancel_reason: "Hết hàng" }));
  });

  it("adds an internal note", async () => {
    svc.order.mockResolvedValue({ ...order, notes: [{ id: 1, body: "Khách hẹn chiều", by: "Quản trị", at: null }] } as never);
    svc.addOrderNote.mockResolvedValue({ id: 2, body: "Gọi lại", by: "Quản trị", at: null });
    renderAdmin("/admin/don-hang/7");
    expect(await screen.findByText("Khách hẹn chiều")).toBeTruthy();
    expect(screen.getByText("Chỉ quản trị viên thấy, khách hàng không xem được.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Thêm ghi chú"), { target: { value: " Gọi lại " } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ghi chú" }));
    await waitFor(() => expect(svc.addOrderNote).toHaveBeenCalledWith(7, "Gọi lại"));
  });

  it("orders list: status tabs with counts, bulk status with partial-success report", async () => {
    svc.orders.mockResolvedValue({ data: [
      { id: 7, order_code: "DH001", customer_name: "An", customer_phone: "09", status: "pending", payment_method: "cod", payment_status: "unpaid", total_amount: 1, items_count: 1, created_at: null },
      { id: 8, order_code: "DH002", customer_name: "Bình", customer_phone: "09", status: "shipping", payment_method: "vnpay", payment_status: "paid", total_amount: 1, items_count: 1, created_at: null },
    ], meta: { ...meta, total: 2 } } as never);
    svc.bulkOrderStatus.mockResolvedValue({ succeeded: 1, failed: 1, results: [
      { id: 7, order_code: "DH001", ok: true, message: null },
      { id: 8, order_code: "DH002", ok: false, message: "Không thể chuyển từ Đang giao sang Đã xác nhận." },
    ] });
    const router = renderAdmin("/admin/don-hang");
    const tab = await screen.findByRole("button", { name: /Chờ xác nhận\s*1/ });
    expect(screen.getByRole("button", { name: /Tất cả\s*3/ }).getAttribute("aria-pressed")).toBe("true");
    await screen.findByText("DH001");
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(screen.getByLabelText("Chọn tất cả hàng trên trang"));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(svc.bulkOrderStatus).toHaveBeenCalledWith({ ids: [7, 8], status: "confirmed", cancel_reason: undefined }, expect.anything()));
    const report = await screen.findByRole("dialog", { name: "Kết quả cập nhật hàng loạt" });
    expect(within(report).getByText(/Không thể chuyển từ Đang giao/)).toBeTruthy();
    fireEvent.click(within(report).getAllByRole("button", { name: "Đóng" })[0]);
    fireEvent.click(tab);
    await waitFor(() => expect(router.state.location.search).toContain("status=pending"));
  });

  it("prints delivery slips with store info, COD amount and a barcode", async () => {
    svc.printOrders.mockResolvedValue({ store: { name: "Đồ Điện Siêu Xịn", phone: "0281234567", address: "1 Lê Lợi", email: null },
      orders: [{ ...order, cod_amount: 130000 }] } as never);
    renderAdmin("/admin/don-hang/in?ids=7,7,abc");
    expect(await screen.findByText(/THU HỘ \(COD\)/)).toBeTruthy();
    expect(svc.printOrders).toHaveBeenCalledWith([7], expect.anything());
    expect(screen.getByRole("img", { name: "Mã vạch DH001" })).toBeTruthy();
    expect(screen.getByText("PHIẾU GIAO HÀNG")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "A4" }));
    expect(localStorage.getItem("admin-print-paper")).toBe("A4");
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
    fireEvent.click(screen.getByRole("button", { name: "Ẩn đánh giá" }));
    await waitFor(() => expect(svc.moderateReview).toHaveBeenCalledWith(1, false));
    fireEvent.click(screen.getByRole("button", { name: "Hiện đánh giá" }));
    await waitFor(() => expect(svc.moderateReview).toHaveBeenCalledWith(2, true));
    fireEvent.click(screen.getAllByRole("button", { name: "Xóa đánh giá" })[0]);
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Hủy bỏ" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(svc.deleteReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Xóa đánh giá" })[0]);
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
    fireEvent.click(within(items[0]).getByRole("button", { name: "Xóa danh mục Đèn LED" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Xóa" }));
    expect(await screen.findByText("Danh mục còn danh mục con hoặc sản phẩm.")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
  });

  it("creates a coupon", async () => {
    svc.coupons.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.createCoupon.mockResolvedValue({} as never);
    const router = renderAdmin("/admin/ma-giam-gia");
    fireEvent.click(await screen.findByRole("button", { name: "+ Tạo mã giảm giá" }));
    await waitFor(() => expect(router.state.location.search).toBe("?them=1"));
    const dialog = await screen.findByRole("dialog", { name: "Tạo mã giảm giá" });
    fireEvent.change(within(dialog).getByLabelText("Mã"), { target: { value: "giam10" } });
    expect(await seriousViolations()).toEqual([]);
    fireEvent.change(screen.getByLabelText("Loại"), { target: { value: "percent" } });
    fireEvent.change(screen.getByLabelText("Giá trị"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Tạo mã" }));
    await waitFor(() => expect(svc.createCoupon).toHaveBeenCalledWith(expect.objectContaining({ code: "giam10", type: "percent", value: 10, starts_at: null })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Tạo mã giảm giá" })).toBeNull());
    expect(router.state.location.search).toBe("");
  });

  it("asks before discarding unsaved changes in a form modal", async () => {
    svc.coupons.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    renderAdmin("/admin/ma-giam-gia?them=1");
    const dialog = await screen.findByRole("dialog", { name: "Tạo mã giảm giá" });
    // chưa sửa gì → đóng ngay
    fireEvent.change(within(dialog).getByLabelText("Mã"), { target: { value: "X" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
    const ask = await screen.findByRole("alertdialog", { name: "Bỏ thay đổi?" });
    fireEvent.click(within(ask).getByRole("button", { name: "Tiếp tục sửa" }));
    expect(screen.getByRole("dialog", { name: "Tạo mã giảm giá" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(within(await screen.findByRole("alertdialog", { name: "Bỏ thay đổi?" })).getByRole("button", { name: "Bỏ thay đổi" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Tạo mã giảm giá" })).toBeNull());
  });

  it("saves a category modal with Ctrl+S", async () => {
    svc.categories.mockResolvedValue([]);
    svc.createCategory.mockResolvedValue({} as never);
    renderAdmin("/admin/danh-muc");
    fireEvent.click(await screen.findByRole("button", { name: "+ Thêm danh mục" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm danh mục" });
    expect(await seriousViolations()).toEqual([]);
    fireEvent.change(within(dialog).getByLabelText(/Tên danh mục/), { target: { value: "Đèn LED" } });
    fireEvent.keyDown(document, { key: "s", ctrlKey: true });
    await waitFor(() => expect(svc.createCategory).toHaveBeenCalledWith(expect.objectContaining({ name: "Đèn LED" })));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("opens the edit modal from ?sua=ID and syncs images on save", async () => {
    svc.products.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.categories.mockResolvedValue([]);
    svc.product.mockResolvedValue({
      id: 5, name: "Bóng đèn", slug: "bong-den", status: "draft", is_featured: false, brand_id: null, category_ids: [], short_description: null, description: null,
      unit: "cái", specifications: {}, meta_title: null, meta_description: null, created_at: null, updated_at: null, thumbnail_url: "/storage/products/a.webp",
      variants: [{ id: 1, sku: "BD", name: "Mặc định", price: 1, compare_at_price: null, cost_price: null, stock_quantity: 1, weight_grams: 0, image_url: null, is_default: true, is_active: true }],
      media: [
        { id: 11, url: "/storage/products/a.webp", alt_text: null, sort_order: 0, is_primary: true },
        { id: 12, url: "/storage/products/b.webp", alt_text: null, sort_order: 1, is_primary: false },
      ],
    } as never);
    svc.updateProduct.mockResolvedValue({ id: 5 } as never);
    svc.deleteProductImage.mockResolvedValue([] as never);
    svc.reorderProductImages.mockResolvedValue([] as never);
    renderAdmin("/admin/san-pham?sua=5");
    const dialog = await screen.findByRole("dialog", { name: "Sửa sản phẩm: Bóng đèn" });
    expect(screen.queryByLabelText("URL ảnh")).toBeNull();
    fireEvent.click(within(dialog).getByRole("tab", { name: /Hình ảnh/ }));
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Xóa ảnh 1" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(svc.reorderProductImages).toHaveBeenCalledWith(5, [12], 12));
    expect(svc.deleteProductImage).toHaveBeenCalledWith(5, 11);
    expect(svc.updateProduct.mock.calls[0][1]).not.toHaveProperty("media");
    expect(svc.updateProduct.mock.calls[0][1]).not.toHaveProperty("thumbnail_url");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("creates a product then uploads the chosen images with the selected primary", async () => {
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:preview-${++n}`);
    URL.revokeObjectURL = vi.fn();
    svc.products.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.categories.mockResolvedValue([]);
    svc.createProduct.mockResolvedValue({ id: 9 } as never);
    let up = 100;
    svc.uploadProductImage.mockImplementation(async (_id, _f, onProgress) => { onProgress?.(50); return { id: ++up, url: "/x.webp", is_primary: false, images: [] }; });
    svc.reorderProductImages.mockResolvedValue([] as never);
    renderAdmin("/admin/san-pham");
    fireEvent.click(await screen.findByRole("button", { name: "+ Thêm sản phẩm" }));
    const dialog = await screen.findByRole("dialog", { name: "Thêm sản phẩm" });
    fireEvent.change(within(dialog).getByLabelText(/Tên sản phẩm/), { target: { value: "Đèn" } });
    fireEvent.click(within(dialog).getByRole("tab", { name: /Hình ảnh/ }));
    const png = (name: string) => new File(["x"], name, { type: "image/png" });
    fireEvent.change(within(dialog).getByLabelText("Chọn ảnh từ máy"), { target: { files: [png("a.png"), png("b.png"), new File(["x"], "c.pdf", { type: "application/pdf" })] } });
    expect(within(dialog).getByRole("alert").textContent).toContain("c.pdf: chỉ nhận ảnh JPG, PNG hoặc WebP.");
    expect(within(dialog).getAllByRole("img").map((i) => i.getAttribute("src"))).toEqual(["blob:preview-1", "blob:preview-2"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Đưa ảnh 2 lên trước" }));
    fireEvent.click(within(dialog).getAllByRole("radio", { name: "Ảnh chính" })[1]);
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(svc.reorderProductImages).toHaveBeenCalledWith(9, [101, 102], 102));
    expect(svc.uploadProductImage.mock.calls.map((c) => [c[0], (c[1] as File).name])).toEqual([[9, "b.png"], [9, "a.png"]]);
    expect(svc.createProduct.mock.calls[0][0]).not.toHaveProperty("media");
  });

  const row = { id: 5, name: "Bóng đèn", slug: "bong-den", status: "published" as const, is_featured: false, thumbnail_url: null, brand: { id: 1, name: "Rạng Đông" },
    categories: [{ id: 3, name: "Đèn" }], price_min: 50000, price_max: 90000, sku: "BD-01", stock_total: 3, variants_count: 2, updated_at: "2026-10-26T09:00:00+07:00" };

  it("R5: danh sách sản phẩm có cột mới, lọc thương hiệu, thao tác hàng loạt báo kết quả từng dòng", async () => {
    svc.products.mockResolvedValue({ data: [row, { ...row, id: 6, name: "Quạt", sku: "Q-1", stock_total: 50 }], meta: { ...meta, total: 2 } });
    svc.categories.mockResolvedValue([{ id: 3, name: "Đèn", slug: "den", parent_id: null }] as never);
    svc.bulkProducts.mockResolvedValue({ succeeded: 1, failed: 1, results: [{ id: 5, name: "Bóng đèn", ok: true, message: null }, { id: 6, name: "Quạt", ok: false, message: "Không có biến thể nào đang bán." }] });
    const router = renderAdmin("/admin/san-pham?brand_id=1");
    expect(await screen.findByText("BD-01")).toBeTruthy();
    await waitFor(() => expect(svc.products).toHaveBeenCalledWith(expect.objectContaining({ brand_id: "1" }), expect.anything()));
    expect(screen.getAllByText(/50\.000.*–.*90\.000/)).toHaveLength(2);
    expect(screen.getByText("3").className).toContain("text-admin-danger");
    expect(await seriousViolations()).toEqual([]);

    fireEvent.click(screen.getByRole("checkbox", { name: /Chọn tất cả/ }));
    fireEvent.click(screen.getByRole("button", { name: "Hiện" }));
    await waitFor(() => expect(svc.bulkProducts).toHaveBeenCalledWith({ action: "status", status: "published", ids: [5, 6] }));
    const report = await screen.findByRole("dialog", { name: "Kết quả thao tác hàng loạt" });
    expect(report.textContent).toContain("Quạt: Không có biến thể nào đang bán.");
    expect(router.state.location.search).toContain("brand_id=1");
  });

  it("R5: nút biểu tượng có tooltip, nhân bản rồi mở bản sao để sửa", async () => {
    svc.products.mockResolvedValue({ data: [row], meta });
    svc.categories.mockResolvedValue([]);
    svc.duplicateProduct.mockResolvedValue({ id: 77 } as never);
    svc.product.mockReturnValue(new Promise(() => {}));
    const router = renderAdmin("/admin/san-pham");
    const dup = await screen.findByRole("button", { name: "Nhân bản Bóng đèn" });
    expect(screen.queryByRole("button", { name: /Thao tác cho/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Xem ngoài shop/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Xem chi tiết Bóng đèn" }).getAttribute("href")).toBe("/admin/san-pham/5");
    expect(screen.getByRole("link", { name: "Bóng đèn" }).getAttribute("href")).toBe("/admin/san-pham/5");
    fireEvent.focus(dup);
    const tip = await screen.findByRole("tooltip");
    expect(tip.textContent).toBe("Nhân bản");
    expect(dup.getAttribute("aria-describedby")).toBe(tip.id);
    expect(await seriousViolations()).toEqual([]);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    fireEvent.click(dup);
    await waitFor(() => expect(svc.duplicateProduct).toHaveBeenCalledWith(5));
    await waitFor(() => expect(router.state.location.search).toBe("?sua=77"));
  });

  const fullProduct = {
    id: 5, name: "Bóng đèn", slug: "bong-den", status: "published", is_featured: true, brand_id: 1, category_ids: [3], short_description: "Tiết kiệm điện",
    description: '<p>Sáng <strong>mạnh</strong></p><script>alert(1)</script><img src="/a.webp" onerror="x()">',
    unit: "cái", specifications: { "Công suất": "9W" }, meta_title: "Bóng đèn LED", meta_description: null, created_at: "2026-10-20T09:00:00+07:00", updated_at: "2026-10-26T09:00:00+07:00",
    thumbnail_url: "/storage/products/a.webp",
    variants: [
      { id: 1, sku: "BD-9", name: "9W", price: 50000, compare_at_price: 60000, cost_price: null, stock_quantity: 2, weight_grams: 0, image_url: null, is_default: true, is_active: true },
      { id: 2, sku: "BD-12", name: "12W", price: 90000, compare_at_price: null, cost_price: null, stock_quantity: 40, weight_grams: 0, image_url: null, is_default: false, is_active: true },
    ],
    media: [
      { id: 12, url: "/storage/products/b.webp", alt_text: null, sort_order: 0, is_primary: false },
      { id: 11, url: "/storage/products/a.webp", alt_text: null, sort_order: 1, is_primary: true },
    ],
  };

  it("trang chi tiết sản phẩm: chỉ xem, ảnh chính trước, tồn kho thấp, mô tả đã lọc, đánh giá, lịch sử", async () => {
    svc.product.mockResolvedValue(fullProduct as never);
    svc.categories.mockResolvedValue([{ id: 3, name: "Đèn LED", slug: "den", parent_id: null }] as never);
    svc.reviews.mockResolvedValue({ data: [{ id: 1, rating: 4, comment: "Rất sáng", images: [], is_approved: true, verified_purchase: true, created_at: "2026-10-25T09:00:00+07:00", product: null, user: { id: 2, name: "Lan", email: "l@x.vn" } }], meta });
    svc.productHistory.mockResolvedValue([{ id: 9, action: "product.updated", changes: { status: ["draft", "published"], name: ["A", "B"] }, user: { id: 1, name: "Quản trị" }, created_at: "2026-10-26T09:00:00+07:00" }] as never);
    renderAdmin("/admin/san-pham/5");
    expect(await screen.findByRole("heading", { name: "Bóng đèn", level: 1 })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /Breadcrumb|Đường dẫn/ }).textContent).toContain("Chi tiết sản phẩm");
    expect(screen.getByRole("img", { name: "Bóng đèn" }).getAttribute("src")).toBe("/storage/products/a.webp");
    expect(screen.getByText("2").className).toContain("text-admin-danger");
    expect(screen.getByText("BD-9, BD-12")).toBeTruthy();
    expect(await screen.findByText("Đèn LED")).toBeTruthy();
    expect(screen.getByText("9W", { selector: "dd" })).toBeTruthy();
    const desc = screen.getByText("mạnh").closest(".rich-prose") as HTMLElement;
    expect(desc.innerHTML).not.toMatch(/script|onerror/);
    expect(await screen.findByText("Rất sáng")).toBeTruthy();
    expect(svc.reviews).toHaveBeenCalledWith(expect.objectContaining({ product_id: "5" }), expect.anything());
    expect(await screen.findByText("Cập nhật sản phẩm")).toBeTruthy();
    expect(screen.getByText(/trạng thái: draft → published · Đổi tên/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText(/Xem ngoài shop/)).toBeNull();
    expect(await seriousViolations()).toEqual([]);
  });

  it("trang chi tiết: Sửa mở modal ?sua, Nhân bản, Xóa có xác nhận rồi về danh sách", async () => {
    svc.product.mockResolvedValue(fullProduct as never);
    svc.categories.mockResolvedValue([]);
    svc.reviews.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.productHistory.mockResolvedValue([]);
    svc.duplicateProduct.mockResolvedValue({ id: 77 } as never);
    svc.deleteProduct.mockResolvedValue(undefined as never);
    svc.products.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    const router = renderAdmin("/admin/san-pham/5");
    fireEvent.click(await screen.findByRole("button", { name: "Sửa" }));
    await waitFor(() => expect(router.state.location.search).toBe("?sua=5"));
    expect(await screen.findByRole("dialog", { name: "Sửa sản phẩm: Bóng đèn" })).toBeTruthy();
    expect(router.state.location.pathname).toBe("/admin/san-pham/5");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: "Nhân bản" }));
    await waitFor(() => expect(svc.duplicateProduct).toHaveBeenCalledWith(5));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/san-pham/77"));
    await router.navigate("/admin/san-pham/5");

    fireEvent.click(await screen.findByRole("button", { name: "Xóa" }));
    const dlg = await screen.findByRole("alertdialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(svc.deleteProduct).toHaveBeenCalledWith(5));
    await waitFor(() => expect(router.state.location.pathname).toBe("/admin/san-pham"));
  });

  it("trang chi tiết: lỗi tải thì báo lỗi có nút thử lại", async () => {
    svc.product.mockRejectedValue(new ApiError("Không tìm thấy", { status: 404, code: "NOT_FOUND" }));
    svc.categories.mockResolvedValue([]);
    renderAdmin("/admin/san-pham/5");
    expect((await screen.findByRole("alert")).textContent).toContain("Không tìm thấy dữ liệu.");
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
  });

  it("R5: modal 5 tab, báo thay đổi chưa lưu, chặn lưu khi SKU trùng, tab nằm trên URL", async () => {
    svc.products.mockResolvedValue({ data: [], meta: { ...meta, total: 0 } });
    svc.categories.mockResolvedValue([]);
    const router = renderAdmin("/admin/san-pham?them=1");
    const dialog = await screen.findByRole("dialog", { name: "Thêm sản phẩm" });
    expect(within(dialog).getAllByRole("tab").map((t) => t.textContent?.replace(/\s*\(\d+\)/, ""))).toEqual(["Thông tin chung", "Biến thể & tồn kho", "Hình ảnh", "Thông số kỹ thuật", "SEO"]);
    expect(await within(dialog).findByRole("toolbar", { name: "Định dạng mô tả" })).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "Độ hoàn thiện" })).toBeTruthy();
    expect(within(dialog).queryByText(/Có thay đổi chưa lưu/)).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Tên sản phẩm/), { target: { value: "Áo" } });
    expect(within(dialog).getByText(/Có thay đổi chưa lưu/)).toBeTruthy();

    fireEvent.click(within(dialog).getByRole("tab", { name: /Biến thể/ }));
    expect(router.state.location.search).toContain("tab=variants");
    fireEvent.change(within(dialog).getByLabelText("SKU biến thể 1"), { target: { value: "AO-1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Nhân đôi biến thể 1" }));
    fireEvent.change(within(dialog).getByLabelText("SKU biến thể 2"), { target: { value: "ao-1" } });
    expect(within(dialog).getAllByText("SKU bị trùng.")).toHaveLength(2);
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(svc.createProduct).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("tab", { name: "SEO" }));
    expect(within(dialog).getByText("Xem trước trên Google")).toBeTruthy();
  });
});
