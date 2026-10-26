import { describe, expect, it } from "vitest";
import { NEVER_CACHE, pwaOptions } from "./pwaConfig.ts";

describe("PWA config", () => {
  it("không cache API/auth: NetworkOnly và loại khỏi navigateFallback", () => {
    const rc = pwaOptions.workbox?.runtimeCaching ?? [];
    expect(rc).toHaveLength(1);
    expect(rc[0].handler).toBe("NetworkOnly");
    const match = rc[0].urlPattern as (o: { url: URL; sameOrigin: boolean }) => boolean;
    const u = (p: string) => ({ url: new URL(p, "http://x"), sameOrigin: true }) ;
    expect(match(u("/api/products"))).toBe(true);
    expect(match(u("/sanctum/csrf-cookie"))).toBe(true);
    expect(match(u("/san-pham"))).toBe(false);
    for (const p of ["/api/user", "/sanctum/csrf-cookie", "/storage/a.webp", "/admin"]) expect(NEVER_CACHE.test(p)).toBe(true);
    expect(NEVER_CACHE.test("/san-pham")).toBe(false);
  });

  it("chỉ precache tài nguyên tĩnh", () => {
    const g = pwaOptions.workbox?.globPatterns ?? [];
    expect(g.join()).not.toMatch(/json|api/);
    expect(pwaOptions.manifest && pwaOptions.manifest.lang).toBe("vi");
  });
});
