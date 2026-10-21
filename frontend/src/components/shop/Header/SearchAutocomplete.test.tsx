// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { productService } from "../../../services/productService.ts";
import { SearchAutocomplete } from "./SearchAutocomplete.tsx";

vi.mock("../../../services/productService.ts", () => ({ productService: { suggest: vi.fn() } }));

const items = [
  { id: 1, name: "Đèn LED A", slug: "den-led-a", min_price: 10000 },
  { id: 2, name: "<img src=x onerror=alert(1)>", slug: "den-led-b", min_price: 20000 },
];

function setup() {
  const router = createMemoryRouter(
    [{ path: "*", element: <SearchAutocomplete /> }],
    { initialEntries: ["/"] },
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
  return { router, input: screen.getByRole("combobox", { name: "Tìm kiếm sản phẩm" }) };
}

async function flush(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("SearchAutocomplete", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(productService.suggest).mockReset();
    vi.mocked(productService.suggest).mockImplementation(async (q) => (q.startsWith("đè") ? items : []));
  });
  afterEach(() => vi.useRealTimers());

  it("debounces, needs 2 chars, sends one request per settled term, and passes an AbortSignal", async () => {
    const { input } = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "đ" } });
    await flush(400);
    expect(productService.suggest).not.toHaveBeenCalled();

    for (const v of ["đè", "đèn", "đèn l"]) {
      fireEvent.change(input, { target: { value: v } });
      await flush(100);
    }
    await flush(400);
    expect(productService.suggest).toHaveBeenCalledTimes(1);
    expect(vi.mocked(productService.suggest).mock.calls[0]![0]).toBe("đèn l");
    expect(vi.mocked(productService.suggest).mock.calls[0]![1]).toBeInstanceOf(AbortSignal);
    expect(await screen.findByRole("option", { name: /Đèn LED A/ })).toBeTruthy();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    // tên chứa HTML được render như text
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
    expect(document.querySelector("li img")).toBeNull();
  });

  it("supports arrow keys, Enter to open the product, and Escape to close", async () => {
    const { input, router } = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "đèn" } });
    await flush(400);
    await screen.findByRole("option", { name: /Đèn LED A/ });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" }); // vòng lại đầu
    const first = screen.getAllByRole("option")[0]!;
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(first.id);
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(screen.getAllByRole("option")[1]!.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.getAttribute("aria-expanded")).toBe("false");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await flush(10);
    expect(router.state.location.pathname).toBe("/san-pham/den-led-a");
  });

  it("submits a full search when no option is active", async () => {
    const { input, router } = setup();
    fireEvent.change(input, { target: { value: "ổ cắm" } });
    fireEvent.submit(input.closest("form")!);
    await flush(10);
    expect(router.state.location.pathname).toBe("/san-pham");
    expect(new URLSearchParams(router.state.location.search).get("search")).toBe("ổ cắm");
  });
});
