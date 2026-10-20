import { describe, expect, it } from "vitest";
import { legacyProductLocation } from "./legacyProductLocation.ts";

describe("legacyProductLocation", () => {
  it("maps the old product URL onto /san-pham", () => {
    expect(legacyProductLocation("/products/den-led")).toBe("/san-pham/den-led");
    expect(legacyProductLocation("/products/den-led?ref=home")).toBe("/san-pham/den-led?ref=home");
  });

  it("leaves other paths alone", () => {
    expect(legacyProductLocation("/san-pham/den-led")).toBeNull();
    expect(legacyProductLocation("/products")).toBeNull();
  });
});
