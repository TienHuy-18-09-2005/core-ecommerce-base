// @vitest-environment happy-dom

import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { RouteSeo, Seo } from "./Seo.tsx";
import { clampDescription, fullTitle } from "../../utils/seo.ts";

const meta = (sel: string) => document.head.querySelector(sel)?.getAttribute("content");

describe("Seo (React 19 metadata)", () => {
  it("hoists title, description and Open Graph tags into <head>", async () => {
    const router = createMemoryRouter([{ path: "/san-pham/:slug", element: <Seo title="Đèn LED 9W" description="Đèn <b>sáng</b>   tiết kiệm" image="/storage/a.webp" type="product" /> }], { initialEntries: ["/san-pham/den"] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(document.title).toBe("Đèn LED 9W | Đồ Điện Siêu Xịn"));
    expect(meta('meta[name="description"]')).toBe("Đèn sáng tiết kiệm");
    expect(meta('meta[property="og:title"]')).toBe("Đèn LED 9W | Đồ Điện Siêu Xịn");
    expect(meta('meta[property="og:type"]')).toBe("product");
    expect(meta('meta[property="og:image"]')).toMatch(/\/storage\/a\.webp$/);
    expect(meta('meta[property="og:url"]')).toMatch(/\/san-pham\/den$/);
    expect(document.head.querySelector('link[rel="canonical"]')).toBeTruthy();
  });

  it("uses route handles for static pages and supports noindex", async () => {
    const router = createMemoryRouter([{ path: "/gio-hang", handle: { seo: { title: "Giỏ hàng", noindex: true } }, element: <RouteSeo /> }], { initialEntries: ["/gio-hang"] });
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(document.title).toBe("Giỏ hàng | Đồ Điện Siêu Xịn"));
    expect(meta('meta[name="robots"]')).toBe("noindex, nofollow");
  });

  it("formats titles and clamps descriptions", () => {
    expect(fullTitle()).toBe("Đồ Điện Siêu Xịn — Thiết bị điện chính hãng");
    expect(clampDescription("a".repeat(200)).length).toBe(160);
    expect(clampDescription("")).toContain("Đồ Điện Siêu Xịn");
  });
});
