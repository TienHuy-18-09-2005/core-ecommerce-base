import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, cleanParams, type QueryParams } from "../services/adminService.ts";
import type { AdminRoleInput, AdminCategoryInput, AdminCouponInput, AdminProductInput, BulkProductInput } from "../types/admin.ts";

export const adminKeys = {
  all: ["admin"] as const,
  dashboard: ["admin", "dashboard"] as const,
  products: (p: QueryParams) => ["admin", "products", cleanParams(p)] as const,
  product: (id: number) => ["admin", "product", id] as const,
  productHistory: (id: number) => ["admin", "product-history", id] as const,
  categories: ["admin", "categories"] as const,
  coupons: (p: QueryParams) => ["admin", "coupons", cleanParams(p)] as const,
  orders: (p: QueryParams) => ["admin", "orders", cleanParams(p)] as const,
  order: (id: number) => ["admin", "order", id] as const,
  orderCounts: (p: QueryParams) => ["admin", "order-counts", cleanParams(p)] as const,
  orderPrint: (ids: number[]) => ["admin", "order-print", ids] as const,
  latestOrders: ["admin", "latest-orders"] as const,
  reviews: (p: QueryParams) => ["admin", "reviews", cleanParams(p)] as const,
  permissionCatalog: ["admin", "permission-catalog"] as const,
  roles: (p: QueryParams) => ["admin", "roles", cleanParams(p)] as const,
  staff: (p: QueryParams) => ["admin", "staff", cleanParams(p)] as const,
};

export const useDashboardQuery = () => useQuery({ queryKey: adminKeys.dashboard, queryFn: ({ signal }) => adminService.dashboard(signal) });

export const useAdminProductsQuery = (p: QueryParams) =>
  useQuery({ queryKey: adminKeys.products(p), queryFn: ({ signal }) => adminService.products(p, signal), placeholderData: keepPreviousData });

export const useAdminProductQuery = (id: number | null) =>
  useQuery({ queryKey: adminKeys.product(id ?? 0), queryFn: ({ signal }) => adminService.product(id as number, signal), enabled: id !== null });

export const useAdminProductHistoryQuery = (id: number) =>
  useQuery({ queryKey: adminKeys.productHistory(id), queryFn: ({ signal }) => adminService.productHistory(id, signal) });

export const useAdminCategoriesQuery = () =>
  useQuery({ queryKey: adminKeys.categories, queryFn: ({ signal }) => adminService.categories(signal) });

export const useAdminCouponsQuery = (p: QueryParams) =>
  useQuery({ queryKey: adminKeys.coupons(p), queryFn: ({ signal }) => adminService.coupons(p, signal), placeholderData: keepPreviousData });

export const useAdminOrdersQuery = (p: QueryParams) =>
  useQuery({ queryKey: adminKeys.orders(p), queryFn: ({ signal }) => adminService.orders(p, signal), placeholderData: keepPreviousData });

export const useAdminOrderQuery = (id: number) =>
  useQuery({ queryKey: adminKeys.order(id), queryFn: ({ signal }) => adminService.order(id, signal) });

export const useAdminReviewsQuery = (p: QueryParams) =>
  useQuery({ queryKey: adminKeys.reviews(p), queryFn: ({ signal }) => adminService.reviews(p, signal), placeholderData: keepPreviousData });

/** Mọi thao tác ghi làm mới toàn bộ cache admin (dữ liệu nhỏ, đơn giản & đúng) + catalog shop. */
function useInvalidateAdmin() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: adminKeys.all }),
      client.invalidateQueries({ queryKey: ["products"] }),
      client.invalidateQueries({ queryKey: ["product"] }),
      client.invalidateQueries({ queryKey: ["categories"] }),
      client.invalidateQueries({ queryKey: ["reviews"] }),
    ]);
  };
}

export function useProductMutations() {
  const onSuccess = useInvalidateAdmin();
  return {
    create: useMutation({ mutationFn: (input: AdminProductInput) => adminService.createProduct(input), onSuccess }),
    update: useMutation({ mutationFn: ({ id, input }: { id: number; input: AdminProductInput }) => adminService.updateProduct(id, input), onSuccess }),
    remove: useMutation({ mutationFn: (id: number) => adminService.deleteProduct(id), onSuccess }),
    bulk: useMutation({ mutationFn: (body: BulkProductInput) => adminService.bulkProducts(body), onSuccess }),
    duplicate: useMutation({ mutationFn: (id: number) => adminService.duplicateProduct(id), onSuccess }),
    /** Làm mới cache sau khi đồng bộ ảnh (endpoint ảnh gọi trực tiếp để theo dõi tiến độ). */
    invalidate: onSuccess,
  };
}

export function useCategoryMutations() {
  const onSuccess = useInvalidateAdmin();
  return {
    create: useMutation({ mutationFn: (input: AdminCategoryInput) => adminService.createCategory(input), onSuccess }),
    update: useMutation({ mutationFn: ({ id, input }: { id: number; input: AdminCategoryInput }) => adminService.updateCategory(id, input), onSuccess }),
    remove: useMutation({ mutationFn: (id: number) => adminService.deleteCategory(id), onSuccess }),
  };
}

export function useCouponMutations() {
  const onSuccess = useInvalidateAdmin();
  return {
    create: useMutation({ mutationFn: (input: AdminCouponInput) => adminService.createCoupon(input), onSuccess }),
    update: useMutation({ mutationFn: ({ id, input }: { id: number; input: AdminCouponInput }) => adminService.updateCoupon(id, input), onSuccess }),
    remove: useMutation({ mutationFn: (id: number) => adminService.deleteCoupon(id), onSuccess }),
  };
}

export function useOrderStatusMutation(id: number) {
  const onSuccess = useInvalidateAdmin();
  return useMutation({
    mutationFn: (body: { status: string; admin_note?: string; cancel_reason?: string }) => adminService.updateOrderStatus(id, body),
    onSuccess,
  });
}

export const useOrderStatusCountsQuery = (p: QueryParams) =>
  useQuery({ queryKey: adminKeys.orderCounts(p), queryFn: ({ signal }) => adminService.orderStatusCounts(p, signal), placeholderData: keepPreviousData });

export const useOrderPrintQuery = (ids: number[]) =>
  useQuery({ queryKey: adminKeys.orderPrint(ids), queryFn: ({ signal }) => adminService.printOrders(ids, signal), enabled: ids.length > 0 });

export function useBulkOrderStatusMutation() {
  const onSuccess = useInvalidateAdmin();
  return useMutation({ mutationFn: adminService.bulkOrderStatus, onSettled: onSuccess });
}

export function useOrderNoteMutation(id: number) {
  const onSuccess = useInvalidateAdmin();
  return useMutation({ mutationFn: (body: string) => adminService.addOrderNote(id, body), onSuccess });
}

export function useReviewModeration() {
  const onSuccess = useInvalidateAdmin();
  return {
    moderate: useMutation({ mutationFn: ({ id, approved }: { id: number; approved: boolean }) => adminService.moderateReview(id, approved), onSuccess }),
    remove: useMutation({ mutationFn: (id: number) => adminService.deleteReview(id), onSuccess }),
  };
}

export interface BulkResult { ok: number; failed: number; total: number }

/**
 * Thao tác hàng loạt bằng API từng mục sẵn có (chạy tuần tự để không dồn tải server, mỗi mục độc lập).
 * Trả về số thành công/thất bại để báo người dùng. API bulk riêng (vd. đổi trạng thái đơn) thuộc R4/R5/R10.
 */
export function useBulkAction<Id>(fn: (id: Id) => Promise<unknown>) {
  const onSuccess = useInvalidateAdmin();
  return useMutation({
    mutationFn: async (ids: Id[]): Promise<BulkResult> => {
      let ok = 0;
      for (const id of ids) {
        try { await fn(id); ok++; } catch { /* đếm là thất bại */ }
      }
      return { ok, failed: ids.length - ok, total: ids.length };
    },
    onSettled: onSuccess,
  });
}

/** Như useBulkAction nhưng kèm một tham số chung cho mọi mục (vd. ẩn/hiện). */
export function useBulkActionWith<Id, A>(fn: (id: Id, arg: A) => Promise<unknown>) {
  const onSuccess = useInvalidateAdmin();
  return useMutation({
    mutationFn: async ({ ids, approved }: { ids: Id[]; approved: A }): Promise<BulkResult> => {
      let ok = 0;
      for (const id of ids) {
        try { await fn(id, approved); ok++; } catch { /* đếm là thất bại */ }
      }
      return { ok, failed: ids.length - ok, total: ids.length };
    },
    onSettled: onSuccess,
  });
}

export const usePermissionCatalogQuery = () =>
  useQuery({ queryKey: adminKeys.permissionCatalog, queryFn: ({ signal }) => adminService.permissionCatalog(signal), staleTime: Infinity });

export const useAdminRolesQuery = (p: QueryParams = {}) =>
  useQuery({ queryKey: adminKeys.roles(p), queryFn: ({ signal }) => adminService.roles(p, signal), placeholderData: keepPreviousData });

export const useAdminStaffQuery = (p: QueryParams) =>
  useQuery({ queryKey: adminKeys.staff(p), queryFn: ({ signal }) => adminService.staff(p, signal), placeholderData: keepPreviousData });

/** Vai trò & nhân viên: đổi xong làm mới cache admin và phiên của chính mình (quyền có thể đổi). */
export function useRoleMutations() {
  const invalidate = useInvalidateAdmin();
  const client = useQueryClient();
  const onSuccess = async () => { await Promise.all([invalidate(), client.invalidateQueries({ queryKey: ["auth", "me"] })]); };
  return {
    create: useMutation({ mutationFn: (input: AdminRoleInput) => adminService.createRole(input), onSuccess }),
    update: useMutation({ mutationFn: ({ id, input }: { id: number; input: AdminRoleInput }) => adminService.updateRole(id, input), onSuccess }),
    remove: useMutation({ mutationFn: (id: number) => adminService.deleteRole(id), onSuccess }),
    addStaff: useMutation({ mutationFn: ({ email, roleIds }: { email: string; roleIds: number[] }) => adminService.addStaff(email, roleIds), onSuccess }),
    updateStaff: useMutation({ mutationFn: ({ id, roleIds }: { id: number; roleIds: number[] }) => adminService.updateStaffRoles(id, roleIds), onSuccess }),
    removeStaff: useMutation({ mutationFn: (id: number) => adminService.removeStaff(id), onSuccess }),
  };
}
