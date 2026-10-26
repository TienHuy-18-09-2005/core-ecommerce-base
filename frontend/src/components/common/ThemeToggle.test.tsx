// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./ThemeToggle.tsx";

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: dark && q.includes("dark"), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as never;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle", () => {
  it("follows prefers-color-scheme when nothing is saved", () => {
    mockSystemDark(true);
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(screen.getByRole("button").getAttribute("aria-label")).toContain("Theo hệ thống");
  });

  it("cycles light → dark → system and persists the choice", () => {
    mockSystemDark(false);
    localStorage.setItem("theme", "light");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    fireEvent.click(btn);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(btn);
    expect(localStorage.getItem("theme")).toBeNull();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(btn.getAttribute("aria-label")).toContain("Giao diện: Theo hệ thống");
  });
});
