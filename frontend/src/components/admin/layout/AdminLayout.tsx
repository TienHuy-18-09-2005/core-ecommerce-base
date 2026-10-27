import { ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../../app/useAuth.ts";
import { ThemeToggle } from "../../common/ThemeToggle.tsx";
import { readSidebarCollapsed, saveSidebarCollapsed } from "../../../utils/adminPrefs.ts";
import { adminHref, breadcrumbFor, navGroups } from "../../../pages/admin/adminRoutes.ts";

export { SIDEBAR_KEY } from "../../../utils/adminPrefs.ts";

/** Danh sách nhóm + mục menu. `compact` = chỉ icon (rail 64px). */
function SidebarNav({ compact, compactBelowXl, onNavigate }: { compact: boolean; compactBelowXl?: boolean; onNavigate?: () => void }) {
  // Nhãn ẩn khi thu gọn; ở tablet (lg) luôn là rail, desktop rộng (xl) mới mở đủ.
  const labelCls = compact ? "sr-only" : compactBelowXl ? "sr-only xl:not-sr-only" : "";
  const groupCls = compact ? "sr-only" : compactBelowXl ? "sr-only xl:not-sr-only xl:block" : "block";
  return (
    <nav aria-label="Menu quản trị" className="flex flex-col gap-4 px-2 py-3">
      {navGroups().map((g) => (
        <div key={g.id} role="group" aria-labelledby={`admin-nav-${g.id}`}>
          <p id={`admin-nav-${g.id}`} className={`px-3 pb-1 text-[11px] font-semibold tracking-wider text-admin-sidebar-muted ${groupCls}`}>{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.items.map((r) => {
              const Icon = r.icon;
              return (
                <li key={r.path}>
                  <NavLink to={adminHref(r.path)} end={r.path === ""} onClick={onNavigate} title={r.label}
                    className={({ isActive }) => `flex h-10 items-center gap-3 rounded-lg px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-admin-primary ${isActive ? "bg-admin-sidebar-active font-semibold text-white" : "text-admin-sidebar-fg hover:bg-admin-sidebar-hover"}`}>
                    <Icon aria-hidden className="size-5 shrink-0" />
                    <span className={`truncate ${labelCls}`}>{r.label}</span>
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

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Ngăn kéo menu cho tablet dọc / màn hẹp: bẫy focus, ESC để đóng, trả focus về nút mở. */
function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; opener?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onClose} />
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Menu quản trị"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-slide-in-left flex-col overflow-y-auto bg-admin-sidebar">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-bold text-white">Đồ Điện Siêu Xịn</span>
          <button type="button" onClick={onClose} aria-label="Đóng menu" className="rounded-lg p-2 text-admin-sidebar-fg hover:bg-admin-sidebar-hover"><X aria-hidden className="size-5" /></button>
        </div>
        <SidebarNav compact={false} onNavigate={onClose} />
      </div>
    </div>
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

  const toggle = () => {
    const next = !collapsed;
    saveSidebarCollapsed(next);
    setCollapsed(next);
  };

  return (
    <div className="flex min-h-screen bg-admin-bg text-admin-fg">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-admin-surface focus:px-3 focus:py-2">Bỏ qua menu</a>
      <aside data-collapsed={collapsed} className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto bg-admin-sidebar transition-[width] lg:flex ${collapsed ? "w-16" : "w-16 xl:w-60"}`}>
        <div className="flex h-14 items-center px-4">
          <Link to="/admin" title="Đồ Điện Siêu Xịn" className="flex items-center gap-2 font-bold text-white">
            <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-admin-primary text-sm">Đ</span>
            <span className={collapsed ? "sr-only" : "sr-only xl:not-sr-only truncate"}>Đồ Điện Siêu Xịn</span>
          </Link>
        </div>
        <div className="flex-1"><SidebarNav compact={collapsed} compactBelowXl={!collapsed} /></div>
        <button type="button" onClick={toggle} aria-pressed={collapsed} aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="m-2 hidden h-10 items-center gap-3 rounded-lg px-3 text-sm text-admin-sidebar-muted hover:bg-admin-sidebar-hover hover:text-admin-sidebar-fg xl:flex">
          {collapsed ? <ChevronsRight aria-hidden className="size-5" /> : <><ChevronsLeft aria-hidden className="size-5" /><span>Thu gọn</span></>}
        </button>
      </aside>
      <Drawer open={drawer} onClose={closeDrawer} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-admin-border bg-admin-surface px-4 sm:px-6">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Mở menu" aria-expanded={drawer}
            className="-ml-2 rounded-lg p-2 text-admin-fg-soft hover:bg-admin-subtle lg:hidden"><Menu aria-hidden className="size-5" /></button>
          <div className="min-w-0 flex-1"><Breadcrumb /></div>
          <div className="flex items-center gap-1 text-sm sm:gap-2">
            <Link to="/" className="hidden items-center gap-1 rounded-lg px-2 py-2 font-medium text-admin-primary hover:bg-admin-subtle sm:inline-flex">
              <ExternalLink aria-hidden className="size-4" />Về cửa hàng
            </Link>
            <ThemeToggle className="text-admin-fg-soft! hover:bg-admin-subtle!" />
            <span className="hidden max-w-40 truncate px-2 text-admin-fg-soft md:inline">{user?.name}</span>
            <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-admin-muted hover:bg-admin-subtle hover:text-admin-fg">
              <LogOut aria-hidden className="size-4" /><span className="hidden sm:inline">Đăng xuất</span><span className="sr-only sm:hidden">Đăng xuất</span>
            </button>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1440px] p-4 outline-none sm:p-6">{children}</main>
      </div>
    </div>
  );
}
