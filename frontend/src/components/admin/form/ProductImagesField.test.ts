import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, validateImageFiles } from "./ProductImagesField.tsx";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });

describe("validateImageFiles", () => {
  it("accepts jpeg/png/webp and rejects other types, >5MB and beyond 10 images", () => {
    const r = validateImageFiles([file("a.jpg", "image/jpeg"), file("b.gif", "image/gif"), file("c.png", "image/png", MAX_IMAGE_BYTES + 1), file("d.webp", "image/webp"), file("e.png", "image/png")], 8);
    expect(r.accepted.map((f) => f.name)).toEqual(["a.jpg", "d.webp"]);
    expect(r.errors).toEqual([
      "b.gif: chỉ nhận ảnh JPG, PNG hoặc WebP.",
      "c.png: ảnh vượt quá 5MB.",
      "e.png: mỗi sản phẩm tối đa 10 ảnh.",
    ]);
  });
});
