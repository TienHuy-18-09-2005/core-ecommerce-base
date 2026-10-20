import { describe, expect, it } from "vitest";
import { parseCatalogParams, toApiParams, updateFilters } from "./catalogParams.ts";

describe("catalogParams", () => {
  it("drops invalid values and whitelists sort", () => {
    const f = parseCatalogParams(new URLSearchParams("category_id=abc&brand_id=-2&page=0&sort_by=evil&min_price=1e9x&search=%20den%20"));
    expect(f).toEqual({ category_id: undefined, brand_id: undefined, search: "den", min_price: undefined, max_price: undefined, sort_by: "latest", page: 1 });
  });

  it("swaps inverted price range", () => {
    const f = parseCatalogParams(new URLSearchParams("min_price=500&max_price=100"));
    expect([f.min_price, f.max_price]).toEqual([100, 500]);
  });

  it("resets page to 1 when a filter changes but keeps it for page changes", () => {
    const current = parseCatalogParams(new URLSearchParams("brand_id=2&page=3"));
    expect(updateFilters(current, { category_id: 5 }).toString()).toBe("category_id=5&brand_id=2");
    expect(updateFilters(current, { page: 4 }).toString()).toBe("brand_id=2&page=4");
  });

  it("builds api params with per_page and without defaults", () => {
    expect(toApiParams(parseCatalogParams(new URLSearchParams("sort_by=price_asc")))).toEqual({ sort_by: "price_asc", per_page: 12 });
  });
});
