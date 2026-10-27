import { describe, expect, it } from "vitest";
import { code128B, code128Bars } from "./code128.ts";

describe("code128B", () => {
  it("encodes start B, data, checksum and stop", () => {
    // "A" = 33; checksum (104 + 33) % 103 = 34
    expect(code128B("A")).toBe("211214" + "111323" + "131123" + "2331112");
    expect(code128B("ĐƠN")).toBeNull();
  });
  it("lays out bars with quiet zones", () => {
    const r = code128Bars("ORD-1")!;
    expect(r.width).toBe(11 * (5 + 3) + 2 + 20);
    expect(r.bars[0].x).toBe(10);
  });
});
