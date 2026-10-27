import { describe, expect, it } from "vitest";
import { missingStoreInfo } from "./OrderPrintPage.tsx";

describe("missingStoreInfo (R7)", () => {
  it("nhắc vào Cài đặt, không nhắc tên biến môi trường", () => {
    const msg = missingStoreInfo({ name: "Shop", address: null, phone: null, email: null });
    expect(msg).toContain("địa chỉ và số điện thoại");
    expect(msg).toContain("Cài đặt");
    expect(msg).not.toMatch(/STORE_/);
  });
  it("đủ thông tin thì không nhắc", () => {
    expect(missingStoreInfo({ name: "Shop", address: "1 Lê Lợi", phone: "0281234567", email: null })).toBeNull();
  });
});
