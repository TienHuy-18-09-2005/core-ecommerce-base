// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { productService } from "../../services/productService.ts";
import { ProductList } from "./ProductList.tsx";

vi.mock("../../services/productService.ts", () => ({
  productService: { getCategories: vi.fn(), getBrands: vi.fn(), getProducts: vi.fn(), getProductDetail: vi.fn() },
}));
vi.mock("../../services/cartService.ts", () => ({ cartService: { getCart: vi.fn(), addToCart: vi.fn() } }));

const page = (n: number, last: number, total: number) => ({
  data: total === 0 || n > last ? [] : [{ id: n, name: `SP ${n}`, slug: `sp-${n}`, default_variant_price: 1000 }],
  current_page: n, last_page: last, per_page: 12, total,
});

function setup(url: string) {
  const router = createMemoryRouter([{ path: "/san-pham", element: <ProductList /> }], { initialEntries: [url] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><RouterProvider router={router} /></ToastProvider></QueryClientProvider>);
  return router;
}

describe("ProductList", () => {
  beforeEach(() => {
    vi.mocked(productService.getCategories).mockResolvedValue([
      { id: 1, name: "Đèn", slug: "den", children: [{ id: 2, name: "Đèn LED", slug: "den-led", children: [] }] },
    ]);
    vi.mocked(productService.getBrands).mockResolvedValue([{ id: 7, name: "Cadivi", slug: "cadivi" }]);
    vi.mocked(productService.getProducts).mockReset();
  });

  it("reads filters from the URL, shows breadcrumb, and resets page when a filter changes", async () => {
    vi.mocked(productService.getProducts).mockImplementation(async (p) => page(Number(p?.page ?? 1), 3, 30));
    const router = setup("/san-pham?category_id=2&page=2");

    expect(await screen.findByText("SP 2")).toBeTruthy();
    expect(vi.mocked(productService.getProducts).mock.calls[0]![0]).toEqual({ category_id: "2", page: "2", per_page: 12 });
    expect(await screen.findByRole("heading", { name: "Đèn LED" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Breadcrumb" }).textContent).toContain("Đèn");

    fireEvent.click(screen.getByLabelText("Cadivi"));
    await waitFor(() => expect(router.state.location.search).toBe("?category_id=2&brand_id=7"));

    // back giữ filter cũ
    await router.navigate(-1);
    await waitFor(() => expect(router.state.location.search).toBe("?category_id=2&page=2"));
    expect(await screen.findByText("SP 2")).toBeTruthy();
  });

  it("redirects a page beyond the total to the last page", async () => {
    vi.mocked(productService.getProducts).mockImplementation(async (p) => page(Number(p?.page ?? 1), 3, 30));
    const router = setup("/san-pham?page=99");
    await waitFor(() => expect(router.state.location.search).toBe("?page=3"));
    expect(await screen.findByText("SP 3")).toBeTruthy();
  });

  it("shows empty state with a reset button", async () => {
    vi.mocked(productService.getProducts).mockResolvedValue(page(1, 1, 0));
    const router = setup("/san-pham?search=khongco");
    expect(await screen.findByText("Không có sản phẩm khớp bộ lọc.")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Xoá bộ lọc" })[1]!);
    await waitFor(() => expect(router.state.location.search).toBe(""));
  });

  it("changes sort via the select", async () => {
    vi.mocked(productService.getProducts).mockResolvedValue(page(1, 1, 1));
    const router = setup("/san-pham");
    await screen.findByText("SP 1");
    fireEvent.change(screen.getByLabelText(/Sắp xếp/), { target: { value: "price_desc" } });
    await waitFor(() => expect(router.state.location.search).toBe("?sort_by=price_desc"));
  });
});
