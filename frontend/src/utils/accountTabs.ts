/** Khoá tab trang tài khoản (?tab=). Dùng chung để link từ trang khác luôn khớp tab. */
export const ACCOUNT_TABS = [
  { id: "thong-tin", label: "Thông tin cá nhân" },
  { id: "don-hang", label: "Lịch sử đơn hàng" },
  { id: "dia-chi", label: "Sổ địa chỉ" },
  { id: "mat-khau", label: "Đổi mật khẩu" },
] as const;

export type AccountTabId = (typeof ACCOUNT_TABS)[number]["id"];

export function accountTabPath(tab: AccountTabId): string {
  return `/tai-khoan?tab=${tab}`;
}
