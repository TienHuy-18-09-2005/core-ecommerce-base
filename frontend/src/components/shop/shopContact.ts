export const shopContact = {
  phoneDisplay: "1900 5454",
  phoneHref: "tel:19005454",
  email: "support@core-ecommerce.local",
} as const;

/** R7: ưu tiên SĐT cửa hàng trong Cài đặt; không có thì dùng hotline mặc định. */
export function contactFromSettings(phone: string | null | undefined) {
  const p = phone?.trim();
  if (!p) return { phoneDisplay: shopContact.phoneDisplay as string, phoneHref: shopContact.phoneHref as string };
  return { phoneDisplay: p, phoneHref: `tel:${p.replace(/[^0-9+]/g, "")}` };
}

export const footerLinks = [
  { href: "/gioi-thieu", label: "Về chúng tôi" },
  { href: "/chinh-sach-van-chuyen", label: "Chính sách vận chuyển" },
  { href: "/chinh-sach-doi-tra", label: "Chính sách đổi trả" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
] as const;
