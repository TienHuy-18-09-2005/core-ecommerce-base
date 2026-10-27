// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer.tsx";
import { contactFromSettings, footerLinks, shopContact } from "./shopContact.ts";

describe("Footer", () => {
  it("only links to real pages, the hotline, and email", () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } })}>
        <MemoryRouter>
          <Footer />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    const allowed = new Set<string>([
      ...footerLinks.map((link) => link.href),
      shopContact.phoneHref,
      `mailto:${shopContact.email}`,
    ]);

    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toBeTruthy();
      expect(href).not.toBe("#");
      expect(allowed.has(href ?? "")).toBe(true);
    }
  });

  it("R7: dùng SĐT cửa hàng từ Cài đặt, rỗng thì về hotline mặc định", () => {
    expect(contactFromSettings("028 1234-5678")).toEqual({ phoneDisplay: "028 1234-5678", phoneHref: "tel:02812345678" });
    expect(contactFromSettings("  ").phoneHref).toBe(shopContact.phoneHref);
  });
});
