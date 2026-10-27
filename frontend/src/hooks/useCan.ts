import { useCallback } from "react";
import { useAuth } from "../app/useAuth.ts";
import type { User } from "../types/auth.ts";

/** Mã quyền R6, khớp backend App\Support\Permissions. */
export type Permission =
  | "dashboard.view" | "revenue.view"
  | "products.view" | "products.edit" | "products.delete"
  | "categories.view" | "categories.manage"
  | "orders.view" | "orders.update" | "orders.cancel" | "orders.note" | "orders.print"
  | "coupons.view" | "coupons.manage"
  | "reviews.view" | "reviews.moderate"
  | "audit.view" | "roles.manage" | "settings.view" | "settings.manage";

/** Quyền hiệu lực của user. Chỉ để ẩn/hiện giao diện — server luôn kiểm tra lại. */
export function userCan(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.permissions) return user.permissions.includes(permission);
  return user.role === "admin"; // phiên cũ chưa có trường permissions
}

/** Có vào được khu quản trị không: admin hoặc nhân viên có ít nhất một quyền. */
export function canEnterAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return user.permissions ? user.permissions.length > 0 : true;
  return user.role === "staff" && (user.permissions?.length ?? 0) > 0;
}

/** const can = useCan(); can("products.edit") */
export function useCan() {
  const { user } = useAuth();
  return useCallback((permission: Permission | Permission[] | undefined) => {
    if (!permission) return true;
    return Array.isArray(permission) ? permission.some((p) => userCan(user, p)) : userCan(user, permission);
  }, [user]);
}
