// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "./Toast.tsx";
import { appRoutes } from "./routes.tsx";

vi.mock("../services/productService.ts", () => ({
  productService: {
    getCategories: vi.fn().mockResolvedValue([]),
    getBrands: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn().mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 12,
      total: 0,
    }),
    getProductDetail: vi.fn().mockResolvedValue({
      id: 1,
      name: "Đèn LED",
      slug: "den-led",
      unit: "cái",
      has_variants: false,
      variants: [],
      media: [],
    }),
  },
}));

vi.mock("../services/cartService.ts", () => ({
  cartService: {
    getCart: vi.fn().mockResolvedValue({ id: 1, user_id: null, items: [] }),
    addToCart: vi.fn(),
  },
}));

function renderAt(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe("shop routes", () => {
  it("redirects the old product URL", async () => {
    const router = renderAt("/products/den-led");
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/san-pham/den-led");
    });
  });

  it("shows the not-found page for an unknown URL", async () => {
    renderAt("/khong-co-trang");
    expect(await screen.findByRole("heading", { name: "Không tìm thấy trang" })).toBeTruthy();
  });

  it("sends a guest from /admin to the login page", async () => {
    const router = renderAt("/admin");
    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/dang-nhap");
    });
    expect(router.state.location.search).toContain("redirect=%2Fadmin");
  });
});
