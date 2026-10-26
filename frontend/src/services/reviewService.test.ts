import { describe, expect, it } from "vitest";
import { validateReviewImages } from "./reviewService.ts";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe("validateReviewImages", () => {
  it("accepts jpeg/png/webp up to 2MB", () => {
    expect(validateReviewImages([file("a.jpg", "image/jpeg"), file("b.png", "image/png"), file("c.webp", "image/webp")])).toBeNull();
  });

  it("rejects svg, gif, oversized and more than 3 images", () => {
    expect(validateReviewImages([file("x.svg", "image/svg+xml")])).toMatch(/Chỉ nhận JPEG, PNG hoặc WebP/);
    expect(validateReviewImages([file("x.gif", "image/gif")])).toMatch(/không hợp lệ/);
    expect(validateReviewImages([file("big.jpg", "image/jpeg", 2 * 1024 * 1024 + 1)])).toMatch(/vượt quá 2MB/);
    expect(validateReviewImages([file("a.jpg", "image/jpeg")], 3)).toMatch(/Tối đa 3 ảnh/);
  });
});
