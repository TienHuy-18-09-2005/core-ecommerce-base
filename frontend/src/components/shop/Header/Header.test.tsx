// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { cartQueryKey } from "../../../hooks/useCartQuery.ts";
import type { Cart } from "../../../types/cart.ts";
import { Header } from "./Header.tsx";

vi.mock("../../../services/cartService.ts", () => ({
  cartService: {
    getCart: vi.fn().mockResolvedValue({ id: 1, user_id: null, items: [] }),
    addToCart: vi.fn(),
  },
}));

vi.mock("../../../services/productService.ts", () => ({
  productService: {
    getCategories: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Thiết bị điện",
        slug: "thiet-bi-dien",
        children: [{ id: 2, name: "Đèn LED", slug: "den-led", children: [] }],
      },
    ]),
    getBrands: vi.fn(),
    getProducts: vi.fn(),
    getProductDetail: vi.fn(),
  },
}));

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client, ...view };
}

describe("Header", () => {
  it("shows category names and updates the cart count without a reload", async () => {
    const { client } = renderHeader();

    expect(await screen.findByRole("link", { name: "Đèn LED" })).toBeTruthy();
    expect(screen.getByRole("search")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Đăng nhập/ })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Giỏ hàng/ }).textContent).toContain("0");
    });

    const nextCart: Cart = {
      id: 1,
      user_id: null,
      items: [{ id: 4, cart_id: 1, product_variant_id: 9, quantity: 3 }],
    };
    client.setQueryData(cartQueryKey, nextCart);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Giỏ hàng/ }).textContent).toContain("3");
    });
  });
});
