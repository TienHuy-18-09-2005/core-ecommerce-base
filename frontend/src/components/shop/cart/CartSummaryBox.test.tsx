// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup } from "@testing-library/react";
import { CartSummaryBox } from "./CartSummaryBox.tsx";
import type { CartSummary } from "../../../types/cart.ts";

const base: CartSummary = { item_count: 1, subtotal: 300000, shipping_fee: 30000, total: 330000, has_issues: false };
afterEach(cleanup);

describe("CartSummaryBox (R7 miễn phí vận chuyển)", () => {
  it("không hiện gợi ý khi admin tắt ngưỡng", () => {
    render(<CartSummaryBox summary={{ ...base, free_shipping_threshold: null, free_shipping_remaining: null }} />);
    expect(screen.queryByTestId("free-shipping-hint")).toBeNull();
  });
  it("hiện số tiền còn thiếu", () => {
    render(<CartSummaryBox summary={{ ...base, free_shipping_threshold: 500000, free_shipping_remaining: 200000 }} />);
    expect(screen.getByTestId("free-shipping-hint").textContent).toMatch(/Mua thêm 200\.000/);
  });
  it("báo miễn phí khi đạt ngưỡng", () => {
    render(<CartSummaryBox summary={{ ...base, subtotal: 600000, shipping_fee: 0, total: 600000, free_shipping_threshold: 500000, free_shipping_remaining: 0 }} />);
    expect(screen.getByText("Miễn phí")).toBeTruthy();
    expect(screen.getByTestId("free-shipping-hint").textContent).toMatch(/được miễn phí/);
  });
});
