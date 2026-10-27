import { describe, expect, it } from "vitest";
import { applyBulkPrice, combinations, duplicateSkuRows, emptyVariant, mergeCombos, skuPart } from "./variantUtils.ts";

const v = (sku: string, name = sku, price = 100000) => ({ ...emptyVariant(false, name), sku, price });

describe("variantUtils", () => {
  it("tìm SKU trùng không phân biệt hoa/thường và bỏ qua ô trống", () => {
    expect([...duplicateSkuRows([v("A1"), v(" a1 "), v(""), v(""), v("B")])]).toEqual([0, 1]);
  });
  it("tạo phần SKU không dấu", () => {
    expect(skuPart("Đỏ tươi")).toBe("DO-TUOI");
  });
  it("tạo tổ hợp và gộp không trùng tên/SKU, thay biến thể trống ban đầu", () => {
    const combos = combinations([{ name: "Màu", values: "Đỏ, Xanh, Đỏ" }, { name: "Cỡ", values: "M,L" }, { name: "Rỗng", values: " " }]);
    expect(combos).toEqual([["Đỏ", "M"], ["Đỏ", "L"], ["Xanh", "M"], ["Xanh", "L"]]);
    const first = mergeCombos([emptyVariant(true)], combos, "Áo thun");
    expect(first.added).toBe(4);
    expect(first.variants.map((x) => x.sku)).toEqual(["AO-THUN-DO-M", "AO-THUN-DO-L", "AO-THUN-XANH-M", "AO-THUN-XANH-L"]);
    expect(first.variants[0].is_default).toBe(true);
    const again = mergeCombos(first.variants, combinations([{ name: "Màu", values: "Đỏ,Vàng" }, { name: "Cỡ", values: "M" }]), "Áo thun");
    expect(again.added).toBe(1);
    expect(again.variants.at(-1)?.name).toBe("Vàng / M");
  });
  it("sửa giá hàng loạt chỉ trên dòng chọn", () => {
    const rows = [v("A", "A", 100000), v("B", "B", 199000)];
    expect(applyBulkPrice(rows, new Set([0, 1]), "price", "percent", -10).map((x) => x.price)).toEqual([90000, 179000]);
    expect(applyBulkPrice(rows, new Set([1]), "price", "set", 5).map((x) => x.price)).toEqual([100000, 5]);
    expect(applyBulkPrice(rows, new Set([0]), "price", "amount", -200000)[0].price).toBe(0);
    expect(applyBulkPrice(rows, new Set([0]), "compare_at_price", "set", 0)[0].compare_at_price).toBeNull();
  });
});
