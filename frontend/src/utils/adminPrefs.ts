/** Lựa chọn giao diện khu quản trị (không nhạy cảm): menu thu gọn hay mở rộng. */
export const SIDEBAR_KEY = "admin.sidebar.collapsed";

export function readSidebarCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try { localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0"); } catch { /* chế độ riêng tư */ }
}

/**
 * Lựa chọn giao diện bảng admin (không nhạy cảm): cột ẩn, mật độ, chế độ xem đã lưu.
 * Khóa luôn có tiền tố "admin.table." — không bao giờ lưu dữ liệu nghiệp vụ hay phiên đăng nhập.
 */
export const tablePrefKey = (name: string) => `admin.table.${name}`;

export function readTablePref<T>(name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(tablePrefKey(name));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch { return fallback; }
}

export function saveTablePref(name: string, value: unknown): void {
  try { localStorage.setItem(tablePrefKey(name), JSON.stringify(value)); } catch { /* chế độ riêng tư */ }
}
