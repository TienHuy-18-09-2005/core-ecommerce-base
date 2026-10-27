/** Lựa chọn giao diện khu quản trị (không nhạy cảm): menu thu gọn hay mở rộng. */
export const SIDEBAR_KEY = "admin.sidebar.collapsed";

export function readSidebarCollapsed(): boolean {
  try { return localStorage.getItem(SIDEBAR_KEY) === "1"; } catch { return false; }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try { localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0"); } catch { /* chế độ riêng tư */ }
}
