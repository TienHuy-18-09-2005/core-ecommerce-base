// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import type { CatalogProduct } from "../../types/catalog.ts";
import { ProductCard } from "./ProductCard.tsx";

vi.mock("../../services/cartService.ts", () => ({
  cartService: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
  },
}));

const product: CatalogProduct = {
  id: 1,
  name: '<script>alert("xss")</script>',
  slug: "den-led",
  thumbnail_url: "javascript:alert(1)",
  unit: "cái",
  min_price: 150000,
  default_variant_id: null,
};

function renderCard(item: CatalogProduct = product) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <ProductCard product={item} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("ProductCard", () => {
  it("renders the name as text and uses the local image fallback", () => {
    const { container } = renderCard();

    expect(screen.getByRole("heading", { name: '<script>alert("xss")</script>' })).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/product-fallback.svg");
  });

  it("formats the price in VND", () => {
    renderCard();
    expect(screen.getByText(/150\.000/)).toBeTruthy();
  });
});
