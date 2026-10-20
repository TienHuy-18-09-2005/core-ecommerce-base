import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatCurrency.ts";

describe("formatCurrency", () => {
  it("formats VND with the Vietnamese locale", () => {
    const formatted = formatCurrency(1500000);
    expect(formatted).toContain("1.500.000");
    expect(formatted).toMatch(/₫|VND/);
  });

  it("accepts decimal strings from the API", () => {
    expect(formatCurrency("250000.00")).toContain("250.000");
  });

  it("uses a plain label when the price is missing", () => {
    expect(formatCurrency(null)).toBe("Liên hệ");
    expect(formatCurrency("")).toBe("Liên hệ");
    expect(formatCurrency("abc")).toBe("Liên hệ");
  });
});
