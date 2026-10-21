import { describe, expect, it } from "vitest";
import { isValidVnPhone, normalizeVnPhone } from "./vnPhone.ts";

describe("vnPhone", () => {
  it("accepts VN mobile formats", () => {
    for (const phone of ["0900000000", "+84900000000", "84 912 345 678", "0386.123.456"]) {
      expect(isValidVnPhone(phone)).toBe(true);
    }
  });

  it("rejects invalid numbers", () => {
    for (const phone of ["", "12345", "0100000000", "09000000001", "abc0900000000"]) {
      expect(isValidVnPhone(phone)).toBe(false);
    }
  });

  it("strips separators", () => {
    expect(normalizeVnPhone("090 000-0000")).toBe("0900000000");
  });
});
