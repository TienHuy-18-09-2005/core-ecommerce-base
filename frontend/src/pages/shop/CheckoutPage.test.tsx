// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { ApiError } from "../../services/apiError.ts";
import { cartService } from "../../services/cartService.ts";
import { couponService } from "../../services/couponService.ts";
import { orderService } from "../../services/orderService.ts";
import type { Cart } from "../../types/cart.ts";
import type { Order } from "../../types/order.ts";
import { validateCheckout, EMPTY_CHECKOUT_FORM } from "../../utils/checkoutForm.ts";
import { CheckoutPage } from "./CheckoutPage.tsx";
import { OrderSuccess } from "./OrderSuccess.tsx";

vi.mock("../../services/cartService.ts", () => ({ cartService: { getCart: vi.fn() } }));
vi.mock("../../services/couponService.ts", () => ({ couponService: { check: vi.fn() } }));
vi.mock("../../services/orderService.ts", () => ({
  orderService: { createOrder: vi.fn(), lookup: vi.fn(), getMyOrder: vi.fn() },
}));

const cart = (qty = 2): Cart => ({
  id: 1,
  user_id: null,
  items: [{ id: 10, cart_id: 1, product_variant_id: 5, quantity: qty, product_name: "Đèn LED", variant_name: "18W", unit_price: 100000, line_total: 100000 * qty, warning: null }],
  summary: { item_count: qty, subtotal: 100000 * qty, shipping_fee: 30000, total: 100000 * qty + 30000, has_issues: false },
});

const order: Order = {
  order_code: "ORD-ABC", status: "pending", payment_method: "cod", payment_status: "unpaid",
  subtotal: 200000, discount_amount: 0, shipping_fee: 30000, total_amount: 230000, created_at: null,
  items: [{ product_name: "Đèn LED", variant_name: "18W", sku: "S", thumbnail_url: null, unit_price: 100000, quantity: 2, line_total: 200000 }],
  customer: { name: "A", phone: "0900000000", email: null },
  shipping: { province: "HN", district: "BĐ", ward: "ĐB", address: "1 Test" },
  customer_note: null,
};

function setup() {
  const router = createMemoryRouter(
    [
      { path: "/thanh-toan", element: <CheckoutPage /> },
      { path: "/dat-hang-thanh-cong/:code", element: <OrderSuccess /> },
    ],
    { initialEntries: ["/thanh-toan"] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><RouterProvider router={router} /></ToastProvider></QueryClientProvider>);
  return { router, client };
}

function fill() {
  const values: Record<string, string> = {
    customer_name: "Nguyễn A", customer_phone: "090 000 0000", shipping_province: "Hà Nội",
    shipping_district: "Ba Đình", shipping_ward: "Điện Biên", shipping_address: "1 Test",
  };
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(document.querySelector(`[name="${name}"]`)!, { target: { value } });
  }
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.mocked(cartService.getCart).mockReset().mockResolvedValue(cart());
    vi.mocked(orderService.createOrder).mockReset();
    vi.mocked(couponService.check).mockReset();
  });

  it("validates VN phone and required fields client-side", () => {
    const errors = validateCheckout({ ...EMPTY_CHECKOUT_FORM, customer_phone: "123" });
    expect(errors.customer_name).toBeTruthy();
    expect(errors.customer_phone).toMatch(/không hợp lệ/);
  });

  it("blocks submit with invalid phone and shows only COD", async () => {
    setup();
    await screen.findByRole("heading", { name: "Thanh toán" });
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    fill();
    fireEvent.change(document.querySelector('[name="customer_phone"]')!, { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" }));
    expect(await screen.findByText("Số điện thoại di động Việt Nam không hợp lệ.")).toBeTruthy();
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });

  it("sends one request on double click, reuses the key on retry and navigates on success", async () => {
    let reject!: (e: unknown) => void;
    vi.mocked(orderService.createOrder)
      .mockImplementationOnce(() => new Promise((_, r) => { reject = r; }))
      .mockResolvedValueOnce({ order, replayed: true });
    setup();
    await screen.findByRole("heading", { name: "Thanh toán" });
    fill();

    const button = screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "Đang đặt hàng..." })).toHaveProperty("disabled", true));
    expect(orderService.createOrder).toHaveBeenCalledTimes(1);

    await act(async () => reject(new ApiError("Lỗi mạng", { status: 0, code: "NETWORK_ERROR" })));
    // Form giữ nguyên dữ liệu sau lỗi
    expect((document.querySelector('[name="customer_name"]') as HTMLInputElement).value).toBe("Nguyễn A");

    fireEvent.click(screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" }));
    await screen.findByRole("heading", { name: "Đặt hàng thành công!" });

    const [firstInput, firstKey] = vi.mocked(orderService.createOrder).mock.calls[0];
    const [, secondKey] = vi.mocked(orderService.createOrder).mock.calls[1];
    expect(firstKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondKey).toBe(firstKey);
    expect(firstInput.customer_phone).toBe("0900000000");
    expect(firstInput.payment_method).toBe("cod");
    expect(screen.getByTestId("order-summary").textContent).toContain("ORD-ABC");
  });

  it("creates a new idempotency key when the cart changes", async () => {
    vi.mocked(orderService.createOrder).mockRejectedValue(new ApiError("Hết hàng", { status: 409, code: "STOCK_UNAVAILABLE" }));
    const { client } = setup();
    await screen.findByRole("heading", { name: "Thanh toán" });
    fill();
    fireEvent.click(screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" }));
    await waitFor(() => expect(orderService.createOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" })).toHaveProperty("disabled", false));

    act(() => client.setQueryData(["cart"], cart(1)));
    fireEvent.click(screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" }));
    await waitFor(() => expect(orderService.createOrder).toHaveBeenCalledTimes(2));

    const keys = vi.mocked(orderService.createOrder).mock.calls.map((call) => call[1]);
    expect(keys[1]).not.toBe(keys[0]);
  });

  it("shows the specific coupon rejection reason and server preview totals", async () => {
    vi.mocked(couponService.check)
      .mockRejectedValueOnce(new ApiError("Đơn hàng chưa đạt giá trị tối thiểu 500.000đ để dùng mã này.", { status: 422, code: "COUPON_MIN_ORDER_NOT_MET" }))
      .mockResolvedValueOnce({ code: "GIAM10", subtotal: 200000, discount_amount: 20000, shipping_fee: 30000, total: 210000 });
    setup();
    await screen.findByRole("heading", { name: "Thanh toán" });

    fireEvent.change(screen.getByLabelText("Mã giảm giá"), { target: { value: "SAI" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    expect(await screen.findByText("Đơn hàng chưa đạt giá trị tối thiểu 500.000đ để dùng mã này.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Mã giảm giá"), { target: { value: "GIAM10" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    await waitFor(() => expect(screen.getByTestId("cart-total").textContent).toMatch(/210\.000/));
  });
});

describe("OrderSuccess", () => {
  it("falls back to the lookup form when refreshed as a guest", async () => {
    vi.mocked(orderService.getMyOrder).mockRejectedValue(new ApiError("x", { status: 401, code: "UNAUTHENTICATED" }));
    vi.mocked(orderService.lookup).mockResolvedValue({ ...order, customer: { name: "N*** A", phone: "090****000", email: null } });
    const router = createMemoryRouter([{ path: "/dat-hang-thanh-cong/:code", element: <OrderSuccess /> }], {
      initialEntries: ["/dat-hang-thanh-cong/ORD-ABC"],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);

    const phone = await screen.findByLabelText("Số điện thoại đặt hàng");
    expect((screen.getByLabelText("Mã đơn hàng") as HTMLInputElement).value).toBe("ORD-ABC");
    fireEvent.change(phone, { target: { value: "0900000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Tra cứu" }));
    expect(await screen.findByText(/090\*\*\*\*000/)).toBeTruthy();
    expect(orderService.lookup).toHaveBeenCalledWith("ORD-ABC", "0900000000");
  });
});

describe("CheckoutPage coupon errors at order time", () => {
  it("shows the coupon reason under the coupon field when checkout rejects it", async () => {
    vi.mocked(cartService.getCart).mockResolvedValue(cart());
    vi.mocked(couponService.check).mockResolvedValue({ code: "GIAM10", subtotal: 200000, discount_amount: 20000, shipping_fee: 30000, total: 210000 });
    vi.mocked(orderService.createOrder).mockReset().mockRejectedValue(new ApiError("Mã giảm giá đã hết lượt sử dụng.", { status: 422, code: "COUPON_USAGE_LIMIT_REACHED" }));
    setup();
    await screen.findByRole("heading", { name: "Thanh toán" });
    fireEvent.change(screen.getByLabelText("Mã giảm giá"), { target: { value: "GIAM10" } });
    fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByRole("button", { name: "Bỏ mã" });
    fill();
    fireEvent.click(screen.getByRole("button", { name: "ĐẶT HÀNG NGAY" }));
    expect((await screen.findAllByText("Mã giảm giá đã hết lượt sử dụng.")).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeTruthy();
  });
});
