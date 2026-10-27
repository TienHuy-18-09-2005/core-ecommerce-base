// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitizeHtml.ts";

describe("sanitizeHtml", () => {
  it("bỏ script, thuộc tính on* và link javascript:", () => {
    const out = sanitizeHtml('<p onclick="x()">Chào<script>alert(1)</script></p><a href="javascript:alert(1)">x</a><img src="/a.webp" onerror="y()">');
    expect(out).not.toMatch(/script|onclick|onerror|javascript/);
    expect(out).toContain("<p>Chào</p>");
    expect(out).toContain('src="/a.webp"');
  });
  it("rỗng khi không có mô tả", () => expect(sanitizeHtml(null)).toBe(""));
});
