// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { productService } from "../../services/productService.ts";
import { activeFilterChips, parseCatalogParams } from "../../utils/catalogParams.ts";
import { ProductList } from "./ProductList.tsx";

vi.mock("../../services/productService.ts", () => ({
  productService: { getCategories: vi.fn(), getBrands: vi.fn(), getProducts: vi.fn(), getProductDetail: vi.fn() },
}));
vi.mock("../../services/cartService.ts", () => ({ cartService: { getCart: vi.fn(), addToCart: vi.fn() } }));

function setup(url: string) {
  const router = createMemoryRouter([{ path: "/san-pham", element: <ProductList /> }], { initialEntries: [url] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ToastProvider><RouterProvider router={router} /></ToastProvider></QueryClientProvider>);
  return router;
}

const openDrawer = async () => {
  fireEvent.click(await screen.findByRole("button", { name: /^Bộ lọc/ }));
  return screen.getByRole("dialog", { name: "Bộ lọc" });
};

describe("ProductList – drawer bộ lọc (< lg)", () => {
  beforeEach(() => {
    vi.mocked(productService.getCategories).mockResolvedValue([{ id: 2, name: "Đèn LED", slug: "den-led", children: [] }]);
    vi.mocked(productService.getBrands).mockResolvedValue([{ id: 7, name: "Cadivi", slug: "cadivi" }]);
    vi.mocked(productService.getProducts).mockResolvedValue({
      data: [{ id: 1, name: "SP 1", slug: "sp-1", default_variant_price: 1000 }], current_page: 1, last_page: 1, per_page: 12, total: 1,
    } as never);
  });

  it("nút Bộ lọc hiện số bộ lọc, chip xoá từng bộ lọc", async () => {
    const router = setup("/san-pham?brand_id=7&min_rating=4&sort_by=price_desc");
    const btn = await screen.findByRole("button", { name: /^Bộ lọc/ });
    expect(btn.textContent).toContain("2");
    expect(btn.getAttribute("aria-haspopup")).toBe("dialog");
    const chips = screen.getByRole("list", { name: "Bộ lọc đang áp dụng" });
    await waitFor(() => expect(within(chips).getByRole("button", { name: "Bỏ lọc Cadivi" })).toBeTruthy());
    fireEvent.click(within(chips).getByRole("button", { name: "Bỏ lọc Từ 4 sao" }));
    await waitFor(() => expect(router.state.location.search).toBe("?brand_id=7&sort_by=price_desc"));
    // sort vẫn hiển thị inline
    expect(screen.getByLabelText(/Sắp xếp/)).toBeTruthy();
  });

  it("chỉnh trên bản nháp, chỉ Áp dụng mới ghi URL; khoá cuộn và trả focus", async () => {
    const router = setup("/san-pham?sort_by=name_desc");
    const dialog = await openDrawer();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Đóng bộ lọc" }));

    fireEvent.click(await within(dialog).findByLabelText("Cadivi"));
    expect(router.state.location.search).toBe("?sort_by=name_desc");
    const apply = within(dialog).getAllByRole("button", { name: "Áp dụng" });
    fireEvent.click(apply[apply.length - 1]!);
    await waitFor(() => expect(router.state.location.search).toBe("?brand_id=7&sort_by=name_desc"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement?.textContent).toContain("Bộ lọc");
  });

  it("ESC / nút đóng huỷ bản nháp; Xóa bộ lọc giữ sort", async () => {
    const router = setup("/san-pham?brand_id=7&sort_by=name_desc");
    let dialog = await openDrawer();
    fireEvent.click(within(dialog).getByLabelText(/Từ 3 sao/));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(router.state.location.search).toBe("?brand_id=7&sort_by=name_desc");

    dialog = await openDrawer();
    fireEvent.click(within(dialog).getByRole("button", { name: "Đóng bộ lọc" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    dialog = await openDrawer();
    fireEvent.click(within(dialog).getByRole("button", { name: "Xóa bộ lọc" }));
    await waitFor(() => expect(router.state.location.search).toBe("?sort_by=name_desc"));
  });

  it("focus trap: Tab ở phần tử cuối quay về đầu", async () => {
    setup("/san-pham");
    const dialog = await openDrawer();
    const apply = within(dialog).getAllByRole("button", { name: "Áp dụng" });
    const last = apply[apply.length - 1]!;
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Đóng bộ lọc" }));
  });

  it("activeFilterChips gộp khoảng giá thành một chip", () => {
    const chips = activeFilterChips(parseCatalogParams(new URLSearchParams("min_price=1000&max_price=5000&search=den")));
    expect(chips.map((c) => c.key)).toEqual(["search", "price"]);
    expect(chips[1]!.patch).toEqual({ min_price: undefined, max_price: undefined });
  });
});
