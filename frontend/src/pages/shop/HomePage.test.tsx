// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../services/apiError.ts";
import { productService } from "../../services/productService.ts";
import { HomePage } from "./HomePage.tsx";

vi.mock("../../services/productService.ts", () => ({
  productService: {
    getCategories: vi.fn(),
    getBrands: vi.fn(),
    getProducts: vi.fn(),
    getProductDetail: vi.fn(),
  },
}));

vi.mock("../../services/cartService.ts", () => ({
  cartService: {
    getCart: vi.fn(),
    addToCart: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(productService.getCategories).mockReset();
    vi.mocked(productService.getBrands).mockReset();
    vi.mocked(productService.getProducts).mockReset();
  });

  it("shows an empty state when a section has no rows", async () => {
    vi.mocked(productService.getCategories).mockResolvedValue([]);
    vi.mocked(productService.getBrands).mockResolvedValue([{ id: 3, name: "Cadivi", slug: "cadivi" }]);
    vi.mocked(productService.getProducts).mockResolvedValue({
      data: [],
      current_page: 1,
      last_page: 1,
      per_page: 8,
      total: 0,
    });

    renderPage();

    expect(await screen.findByText("Chưa có danh mục để hiển thị.")).toBeTruthy();
    expect(await screen.findByText("Chưa có sản phẩm nổi bật.")).toBeTruthy();
    expect(await screen.findByRole("link", { name: "Cadivi" })).toBeTruthy();
  });

  it("shows an error state with a retry button", async () => {
    vi.mocked(productService.getCategories).mockRejectedValue(new ApiError("Lỗi", { status: 500, code: "SERVER_ERROR" }));
    vi.mocked(productService.getBrands).mockRejectedValue(new ApiError("Lỗi", { status: 500, code: "SERVER_ERROR" }));
    vi.mocked(productService.getProducts).mockRejectedValue(new ApiError("Lỗi", { status: 500, code: "SERVER_ERROR" }));

    renderPage();

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBe(3);
    expect(screen.getAllByRole("button", { name: "Thử lại" }).length).toBe(3);
  });
});
