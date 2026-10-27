import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Popup của <select> gốc không render trong happy-dom → kiểm tra quy tắc CSS toàn cục.
const css = readFileSync(resolve(__dirname, "../../index.css"), "utf8");

describe("select gốc theo theme", () => {
  it("đặt color-scheme cho dark và light", () => {
    expect(css).toMatch(/:root\.dark select\s*{\s*color-scheme:\s*dark/);
    expect(css).toMatch(/:root:not\(\.dark\) select\s*{\s*color-scheme:\s*light/);
  });
  it("option/optgroup dùng token admin, optgroup in đậm", () => {
    expect(css).toMatch(/select option,\s*select optgroup\s*{[^}]*background-color:\s*var\(--admin-surface[^}]*color:\s*var\(--admin-fg/);
    expect(css).toMatch(/select optgroup\s*{[^}]*font-weight:\s*700/);
    expect(css).toMatch(/select option:checked[^{]*{[^}]*--admin-primary-subtle/);
  });
});
