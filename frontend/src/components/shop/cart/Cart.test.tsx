// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartDrawerProvider } from "../../../app/CartDrawerProvider.tsx";
import { ToastProvider } from "../../../app/Toast.tsx";
import { useCartDrawer } from "../../../app/useCartDrawer.ts";
import { applyCartResponse, nextCartWrite } from "../../../hooks/useCartQuery.ts";
import { useCrossTabSync } from "../../../hooks/useCrossTabSync.ts";
import { cartService } from "../../../services/cartService.ts";
import type { Cart } from "../../../types/cart.ts";
import { ImageGallery } from "../ImageGallery.tsx";
import { CartDrawer } from "./CartDrawer.tsx";
import { QuantityStepper } from "./QuantityStepper.tsx";

vi.mock("../../../services/cartService.ts", () => ({
  cartService: { getCart: vi.fn(), updateQuantity: vi.fn(), removeItem: vi.fn(), addToCart: vi.fn() },
}));

const cart = (warning: "OUT_OF_STOCK" | null = null): Cart => ({
  id: 1, user_id: null,
  items: [{ id: 7, cart_id: 1, product_variant_id: 3, quantity: 1, product_name: "Ổ cắm", unit_price: 50000, line_total: 50000, stock_quantity: warning ? 0 : 9, warning }],
  summary: { item_count: 1, subtotal: warning ? 0 : 50000, shipping_fee: 30000, total: warning ? 30000 : 80000, has_issues: warning !== null },
});

afterEach(() => vi.useRealTimers());

describe("cart write ordering", () => {
  it("ignores a late response from an older write", () => {
    const client = new QueryClient();
    const older = nextCartWrite();
    const newer = nextCartWrite();
    expect(applyCartResponse(client, newer, cart())).toBe(true);
    expect(applyCartResponse(client, older, cart("OUT_OF_STOCK"))).toBe(false);
    expect(client.getQueryData<Cart>(["cart"])?.items[0].warning).toBeNull();
  });
});

describe("QuantityStepper", () => {
  it("debounces many clicks into one commit", () => {
    vi.useFakeTimers();
    const onCommit = vi.fn();
    render(<QuantityStepper value={1} max={10} label="SL" onCommit={onCommit} />);
    const plus = screen.getByRole("button", { name: "Tăng số lượng" });
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(onCommit).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(400));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(4);
  });

  it("does not exceed max", () => {
    render(<QuantityStepper value={2} max={2} label="SL" onCommit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Tăng số lượng" })).toHaveProperty("disabled", true);
  });
});

function Opener() {
  const drawer = useCartDrawer();
  return <button type="button" onClick={drawer.open}>Mở giỏ</button>;
}

function renderDrawer(data: Cart) {
  vi.mocked(cartService.getCart).mockResolvedValue(data);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <CartDrawerProvider><Opener /><CartDrawer /></CartDrawerProvider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("CartDrawer", () => {
  it("opens as a modal dialog, shows server totals and closes on Escape", async () => {
    renderDrawer(cart());
    fireEvent.click(screen.getByRole("button", { name: "Mở giỏ" }));
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(await screen.findByText("Ổ cắm")).toBeTruthy();
    expect(screen.getByTestId("cart-total").textContent).toMatch(/80\.000/);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Đóng giỏ hàng");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("warns about out-of-stock lines and hides the checkout link", async () => {
    renderDrawer(cart("OUT_OF_STOCK"));
    fireEvent.click(screen.getByRole("button", { name: "Mở giỏ" }));
    expect(await screen.findByText(/Đã hết hàng/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Thanh toán" })).toBeNull();
  });
});

function SyncProbe() {
  useCrossTabSync();
  return null;
}

describe("useCrossTabSync", () => {
  it("refetches the cart when the tab becomes visible", () => {
    const client = new QueryClient();
    const spy = vi.spyOn(client, "invalidateQueries");
    render(<QueryClientProvider client={client}><SyncProbe /></QueryClientProvider>);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(spy).toHaveBeenCalledWith({ queryKey: ["cart"] });
  });
});

describe("ImageGallery", () => {
  it("switches the main image via thumbnails and dedupes sources", () => {
    render(<ImageGallery images={[{ src: "https://a/1.jpg", alt: "A" }, { src: "https://a/2.jpg", alt: "B" }, { src: "https://a/1.jpg", alt: "dup" }]} />);
    const thumbs = screen.getAllByRole("button", { name: /Xem ảnh/ });
    expect(thumbs).toHaveLength(2);
    fireEvent.click(thumbs[1]);
    expect(thumbs[1].getAttribute("aria-current")).toBe("true");
  });
});
