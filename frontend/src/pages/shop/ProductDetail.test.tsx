// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { ApiError } from "../../services/apiError.ts";
import { productService } from "../../services/productService.ts";
import type { Product } from "../../types/product.ts";
import { ProductDetail } from "./ProductDetail.tsx";

vi.mock("../../services/productService.ts", () => ({
  productService: { getCategories: vi.fn(), getBrands: vi.fn(), getProducts: vi.fn(), getProductDetail: vi.fn() },
}));
vi.mock("../../services/reviewService.ts", async (orig) => ({
  ...(await orig<typeof import("../../services/reviewService.ts")>()),
  reviewService: {
    list: vi.fn().mockResolvedValue({
      summary: { average: null, count: 0, distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } },
      reviews: { data: [], current_page: 1, last_page: 1, total: 0 },
    }),
    eligibility: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  },
}));
vi.mock("../../services/cartService.ts", () => ({ cartService: { getCart: vi.fn(), addToCart: vi.fn() } }));

const variant = (id: number, name: string, isDefault: boolean) => ({
  id, product_id: 1, sku: `S${id}`, name, price: id * 1000, stock_quantity: 5, is_default: isDefault, attribute_values: [],
});
const product = (slug: string, name: string): Product => ({
  id: slug.length, name, slug, unit: "cái", has_variants: true, media: [],
  variants: [variant(1, "10W", true), variant(2, "20W", false)],
  specifications: { "Điện áp": "220V", "<img src=x onerror=alert(1)>": "<script>x</script>" },
});

function setup(url: string) {
  const router = createMemoryRouter([{ path: "/san-pham/:slug", element: <ProductDetail /> }], { initialEntries: [url] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><RouterProvider router={router} /></ToastProvider></QueryClientProvider>);
  return router;
}

describe("ProductDetail", () => {
  it("shows a real 404 page for unknown slugs", async () => {
    vi.mocked(productService.getProductDetail).mockRejectedValue(new ApiError("x", { status: 404, code: "NOT_FOUND" }));
    setup("/san-pham/khong-co");
    expect(await screen.findByRole("heading", { name: "Không tìm thấy sản phẩm" })).toBeTruthy();
  });

  it("resets the selected variant when the slug changes and renders specs as text", async () => {
    vi.mocked(productService.getProductDetail).mockImplementation(async (slug) =>
      slug === "a" ? product("a", "Đèn A") : product("bb", "Đèn B"),
    );
    const router = setup("/san-pham/a");
    await screen.findByRole("heading", { name: "Đèn A" });
    fireEvent.click(screen.getByRole("button", { name: "20W" }));
    expect(screen.getByRole("button", { name: "20W" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("<script>x</script>")).toBeTruthy();
    expect(document.querySelector("script, img[src='x']")).toBeNull();
    // 5.5: khu đánh giá nằm dưới thông số kỹ thuật
    const reviews = await screen.findByRole("heading", { name: "Đánh giá sản phẩm" });
    const specs = screen.getByText("Thông số kỹ thuật chi tiết");
    expect(specs.compareDocumentPosition(reviews) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await router.navigate("/san-pham/b");
    await screen.findByRole("heading", { name: "Đèn B" });
    expect(screen.getByRole("button", { name: "10W" }).getAttribute("aria-pressed")).toBe("true");
    const signal = vi.mocked(productService.getProductDetail).mock.calls.at(-1)![1];
    expect(signal).toBeInstanceOf(AbortSignal);
  });
});
