// @vitest-environment happy-dom

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Footer } from "./Footer.tsx";
import { footerLinks, shopContact } from "./shopContact.ts";

describe("Footer", () => {
  it("only links to real pages, the hotline, and email", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
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
});