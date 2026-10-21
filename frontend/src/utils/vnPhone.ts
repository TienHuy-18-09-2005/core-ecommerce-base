/** Di động VN: 0 | +84 | 84 + đầu 3/5/7/8/9 + 8 số. Khớp regex server (VietnamesePhone::PATTERN). */
const VN_MOBILE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

export function normalizeVnPhone(value: string): string {
  return value.replace(/[\s.\-()]/g, "");
}

export function isValidVnPhone(value: string): boolean {
  return VN_MOBILE.test(normalizeVnPhone(value));
}
