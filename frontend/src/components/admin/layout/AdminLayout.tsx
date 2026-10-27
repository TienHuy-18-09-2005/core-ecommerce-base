import { Bell, BellOff, ChevronRight, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../../app/useAuth.ts";
import { Drawer } from "../overlay/Drawer.tsx";
import { Tooltip } from "../ui/IconButton.tsx";
import { ConfirmProvider } from "../overlay/Modal.tsx";
import { useOrderNotifier } from "../../../hooks/useOrderNotifier.ts";
import { useCan } from "../../../hooks/useCan.ts";
import { ThemeToggle } from "../../common/ThemeToggle.tsx";
import { readSidebarCollapsed, saveSidebarCollapsed } from "../../../utils/adminPrefs.ts";
import { adminHref, breadcrumbFor, navGroups } from "../../../pages/admin/adminRoutes.ts";

export { SIDEBAR_KEY } from "../../../utils/adminPrefs.ts";

const XL_QUERY = "(min-width: 80rem)";
/** true khi màn hình ≥1280px (sidebar có thể mở rộng/thu gọn); nhỏ hơn thì nút ☰ mở drawer. */
function useIsXl() {
  const get = () => typeof window.matchMedia === "function" && window.matchMedia(XL_QUERY).matches;
  const [xl, setXl] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(XL_QUERY);
    const on = () => setXl(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return xl;
}

/** Danh sách nhóm + mục menu. `compact` = chỉ icon (rail 64px). */
function SidebarNav({ compact, compactBelowXl, onNavigate, badges = {} }: { compact: boolean; compactBelowXl?: boolean; onNavigate?: () => void; badges?: Record<string, number | null> }) {
  // Nhãn ẩn khi thu gọn; ở tablet (lg) luôn là rail, desktop rộng (xl) mới mở đủ.
  const can = useCan();
  const labelCls = compact ? "sr-only" : compactBelowXl ? "sr-only xl:not-sr-only" : "";
  const groupCls = compact ? "sr-only" : compactBelowXl ? "sr-only xl:not-sr-only xl:block" : "block";
  return (
    <nav aria-label="Menu quản trị" className="flex flex-col gap-4 px-2 py-3">
      {navGroups(undefined, can).map((g) => (
        <div key={g.id} role="group" aria-labelledby={`admin-nav-${g.id}`}>
          <p id={`admin-nav-${g.id}`} className={`px-3 pb-1 text-[11px] font-semibold tracking-wider text-admin-sidebar-muted ${groupCls}`}>{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((r) => {
              const Icon = r.icon;
              const badge = badges[r.path] ?? 0;
              const badgeText = badge > 99 ? "99+" : String(badge);
              return (
                <li key={r.path}>
                  <NavLink to={adminHref(r.path)} end={r.path === ""} onClick={onNavigate} title={r.label}
                    className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-admin-primary ${isActive ? "bg-admin-sidebar-active font-semibold text-white" : "text-admin-sidebar-fg hover:bg-admin-sidebar-hover"}`}>
                    <span className="relative shrink-0">
                      <Icon aria-hidden className="size-5" />
                      {badge > 0 && <span aria-hidden className={`absolute -right-2 -top-1.5 min-w-4 rounded-full bg-admin-danger px-1 text-center text-[10px] font-bold leading-4 text-white ${compact ? "" : compactBelowXl ? "xl:hidden" : "hidden"}`}>{badgeText}</span>}
                    </span>
                    <span className={`truncate ${labelCls}`}>{r.label}</span>
                    {badge > 0 && <span aria-hidden className={`ml-auto rounded-full bg-admin-danger px-2 text-xs font-semibold leading-5 text-white ${compact ? "hidden" : compactBelowXl ? "hidden xl:inline" : ""}`}>{badgeText}</span>}
                    {badge > 0 && <span className="sr-only">, {badge} đơn chờ xác nhận</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function MenuDrawer({ open, onClose, badges }: { open: boolean; onClose: () => void; badges: Record<string, number | null> }) {
  return (
    <Drawer open={open} onClose={onClose} title="Menu quản trị" side="left" width="w-72" className="xl:hidden" hideTitle>
      <div className="flex min-h-full flex-col bg-admin-sidebar">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-bold text-white">Đồ Điện Siêu Xịn</span>
          <button type="button" onClick={onClose} aria-label="Đóng menu" className="rounded-lg p-2 text-admin-sidebar-fg hover:bg-admin-sidebar-hover"><X aria-hidden className="size-5" /></button>
        </div>
        <SidebarNav compact={false} onNavigate={onClose} badges={badges} />
      </div>
    </Drawer>
  );
}

function Breadcrumb() {
  const { pathname } = useLocation();
  const crumbs = breadcrumbFor(pathname);
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight aria-hidden className="size-4 shrink-0 text-admin-muted" />}
            {c.to ? <Link to={c.to} className="truncate text-admin-muted hover:text-admin-fg">{c.label}</Link>
              : <span aria-current="page" className="truncate font-medium text-admin-fg">{c.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [drawer, setDrawer] = useState(false);
  const { pathname } = useLocation();
  const closeDrawer = useCallback(() => setDrawer(false), []);
  useEffect(() => { setDrawer(false); }, [pathname]);
  const can = useCan();
  // Chỉ người xem được đơn mới thăm dò đơn mới (tránh 403 lặp lại).
  const notifier = useOrderNotifier(can("orders.view") ? user?.id : undefined);
  const badges = { "don-hang": notifier.pendingCount };

  const isXl = useIsXl();
  useEffect(() => { if (isXl) setDrawer(false); }, [isXl]);
  // ≥1280px: mở rộng ↔ rail (lưu lại); <1280px (tablet là rail, mobile ẩn sidebar): mở drawer đầy đủ đè lên trang.
  const toggle = () => {
    if (!isXl) { setDrawer(true); return; }
    const next = !collapsed;
    saveSidebarCollapsed(next);
    setCollapsed(next);
  };
  const expanded = isXl ? !collapsed : drawer;

  return (
    <div className="flex min-h-screen bg-admin-bg text-admin-fg print:block print:bg-white print:text-black">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-admin-surface focus:px-3 focus:py-2">Bỏ qua menu</a>
      <aside id="admin-sidebar" data-collapsed={collapsed} className={`print:hidden sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto bg-admin-sidebar transition-[width] lg:flex ${collapsed ? "w-16" : "w-16 xl:w-60"}`}>
        <div className="flex h-14 items-center px-4">
          <Link to="/admin" title="Đồ Điện Siêu Xịn" className="flex items-center gap-2 font-bold text-white">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-admin-primary text-sm">Đ</span>
            <span className={collapsed ? "sr-only" : "sr-only xl:not-sr-only truncate"}>Đồ Điện Siêu Xịn</span>
          </Link>
        </div>
        <div className="flex-1"><SidebarNav compact={collapsed} compactBelowXl={!collapsed} badges={badges} /></div>
      </aside>
      <MenuDrawer open={drawer} onClose={closeDrawer} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-admin-border bg-admin-surface px-4 sm:px-6">
          <Tooltip text={isXl ? (collapsed ? "Mở rộng menu" : "Thu gọn menu") : "Mở menu"}>
            {(t) => (
              <button type="button" {...t} onClick={toggle} aria-label="Mở/Thu gọn menu" aria-expanded={expanded} aria-controls={isXl ? "admin-sidebar" : undefined}
                className="-ml-2 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-admin-fg-soft hover:bg-admin-subtle hover:text-admin-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary">
                <Menu aria-hidden className="size-5" />
              </button>
            )}
          </Tooltip>
          <div className="min-w-0 flex-1"><Breadcrumb /></div>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <Link to="/" className="hidden items-center gap-1 rounded-lg px-2 py-2 font-medium text-admin-primary hover:bg-admin-subtle sm:inline-flex">
              <ExternalLink aria-hidden className="size-4" />Về cửa hàng
            </Link>
            {can("orders.view") && <button type="button" onClick={notifier.toggleSound} aria-pressed={notifier.soundOn}
              aria-label="Âm thanh thông báo đơn mới" title={notifier.soundOn ? "Tắt âm thanh thông báo đơn mới" : "Bật âm thanh thông báo đơn mới"}
              className="rounded-lg p-2 text-admin-fg-soft hover:bg-admin-subtle">
              {notifier.soundOn ? <Bell aria-hidden className="size-5" /> : <BellOff aria-hidden className="size-5" />}
            </button>}
            <ThemeToggle className="text-admin-fg-soft! hover:bg-admin-subtle!" />
            <span className="hidden max-w-40 truncate px-2 text-admin-fg-soft md:inline">{user?.name}</span>
            <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-admin-muted hover:bg-admin-subtle hover:text-admin-fg">
              <LogOut aria-hidden className="size-4" /><span className="hidden sm:inline">Đăng xuất</span><span className="sr-only sm:hidden">Đăng xuất</span>
            </button>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1440px] p-4 outline-none sm:p-6 print:max-w-none print:p-0"><ConfirmProvider>{children}</ConfirmProvider></main>
      </div>
    </div>
  );
}
