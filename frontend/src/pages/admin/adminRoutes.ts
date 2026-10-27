import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent, Boxes, FolderTree, LayoutDashboard, MessageSquareText, ScrollText, Settings, ShieldCheck, ShoppingCart, Tag, Users,
} from "lucide-react";
import DashboardPage from "./DashboardPage.tsx";
import ProductsPage from "./ProductsPage.tsx";
import { ProductCreateRedirect } from "./productRedirects.tsx";
import ProductDetailPage from "./ProductDetailPage.tsx";
import OrdersPage from "./OrdersPage.tsx";
import OrderDetailPage from "./OrderDetailPage.tsx";
import OrderPrintPage from "./OrderPrintPage.tsx";
import CategoriesPage from "./CategoriesPage.tsx";
import CouponsPage from "./CouponsPage.tsx";
import ReviewsPage from "./ReviewsPage.tsx";
import SettingsPage from "./SettingsPage.tsx";
import RolesPage from "./RolesPage.tsx";
import type { Permission } from "../../hooks/useCan.ts";

/** Nhóm menu bên trái, theo thứ tự hiển thị. */
export const ADMIN_GROUPS = [
  { id: "overview", label: "TỔNG QUAN" },
  { id: "sales", label: "BÁN HÀNG" },
  { id: "catalog", label: "CATALOG" },
  { id: "customers", label: "KHÁCH HÀNG" },
  { id: "system", label: "HỆ THỐNG" },
] as const;
export type AdminGroupId = (typeof ADMIN_GROUPS)[number]["id"];

export interface AdminChildRoute {
  /** Đường dẫn con, tương đối với mục cha (vd. "moi", ":id"). */
  path: string;
  label: string;
  component: ComponentType;
  /** Quyền cần có để vào (mặc định theo mục cha). */
  permission?: Permission;
}

export interface AdminRoute {
  /** Đường dẫn tương đối với /admin; "" là trang tổng quan. */
  path: string;
  label: string;
  group: AdminGroupId;
  icon: LucideIcon;
  /** Chưa có màn hình thì để trống: mục bị ẩn khỏi menu và không có route. */
  component?: ComponentType;
  children?: AdminChildRoute[];
  /** R6: quyền cần có để thấy menu & vào trang (bỏ trống = mọi user vào được khu quản trị). */
  permission?: Permission;
}

/** Nguồn duy nhất cho đường dẫn, nhãn, nhóm, icon và breadcrumb của khu quản trị. */
export const ADMIN_ROUTES: AdminRoute[] = [
  { path: "", label: "Tổng quan", group: "overview", icon: LayoutDashboard, component: DashboardPage, permission: "dashboard.view" },
  { path: "don-hang", label: "Đơn hàng", group: "sales", icon: ShoppingCart, component: OrdersPage, permission: "orders.view",
    children: [
      { path: "in", label: "In phiếu giao hàng", component: OrderPrintPage, permission: "orders.print" },
      { path: ":id", label: "Chi tiết đơn", component: OrderDetailPage },
      { path: ":id/in", label: "In phiếu giao hàng", component: OrderPrintPage, permission: "orders.print" },
    ] },
  { path: "ma-giam-gia", label: "Mã giảm giá", group: "sales", icon: BadgePercent, component: CouponsPage, permission: "coupons.view" },
  { path: "san-pham", label: "Sản phẩm", group: "catalog", icon: Boxes, component: ProductsPage, permission: "products.view",
    children: [
      { path: "moi", label: "Thêm sản phẩm", component: ProductCreateRedirect, permission: "products.edit" },
      { path: ":id", label: "Chi tiết sản phẩm", component: ProductDetailPage },
    ] },
  { path: "danh-muc", label: "Danh mục", group: "catalog", icon: FolderTree, component: CategoriesPage, permission: "categories.view" },
  { path: "thuong-hieu", label: "Thương hiệu", group: "catalog", icon: Tag, permission: "products.view" },
  { path: "nguoi-dung", label: "Người dùng", group: "customers", icon: Users, permission: "roles.manage" },
  { path: "danh-gia", label: "Đánh giá", group: "customers", icon: MessageSquareText, component: ReviewsPage, permission: "reviews.view" },
  { path: "vai-tro", label: "Vai trò & phân quyền", group: "system", icon: ShieldCheck, component: RolesPage, permission: "roles.manage" },
  { path: "nhat-ky", label: "Nhật ký", group: "system", icon: ScrollText, permission: "audit.view" },
  { path: "cai-dat", label: "Cài đặt", group: "system", icon: Settings, component: SettingsPage },
];

export const adminHref = (path: string) => (path ? `/admin/${path}` : "/admin");

/** Các mục đã có màn hình, gom theo nhóm (bỏ nhóm rỗng). */
export function navGroups(routes: AdminRoute[] = ADMIN_ROUTES, can: (p: Permission | undefined) => boolean = () => true) {
  return ADMIN_GROUPS.map((g) => ({ ...g, items: routes.filter((r) => r.group === g.id && r.component && can(r.permission)) }))
    .filter((g) => g.items.length > 0);
}

export interface Crumb { label: string; to?: string }

/** Breadcrumb cho một pathname, vd. /admin/san-pham/5 → Quản trị › Sản phẩm › Chi tiết sản phẩm. */
export function breadcrumbFor(pathname: string, routes: AdminRoute[] = ADMIN_ROUTES): Crumb[] {
  const rest = pathname.replace(/^\/admin\/?/, "").replace(/\/+$/, "");
  const [head = "", ...tail] = rest.split("/");
  const route = routes.find((r) => r.component && r.path === head);
  if (!route) return [{ label: "Quản trị", to: "/admin" }, { label: "Không tìm thấy" }];
  if (route.path === "") return [{ label: "Tổng quan" }];
  const crumbs: Crumb[] = [{ label: "Tổng quan", to: "/admin" }];
  if (tail.length === 0) return [...crumbs, { label: route.label }];
  const sub = tail.join("/");
  const matches = (pattern: string) => {
    const parts = pattern.split("/");
    return parts.length === tail.length && parts.every((p, i) => p.startsWith(":") || p === tail[i]);
  };
  const child = route.children?.find((c) => c.path === sub) ?? route.children?.find((c) => matches(c.path));
  return [...crumbs, { label: route.label, to: adminHref(route.path) }, { label: child?.label ?? "Không tìm thấy" }];
}

/** Trang đầu tiên user được vào (dùng khi không có quyền xem Tổng quan). */
export function firstAllowedHref(can: (p: Permission | undefined) => boolean, routes: AdminRoute[] = ADMIN_ROUTES): string | null {
  const r = routes.find((x) => x.component && can(x.permission));
  return r ? adminHref(r.path) : null;
}
