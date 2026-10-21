import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { cartQueryKey } from "../hooks/useCartQuery.ts";
import { notifyAuthChanged, useAuthBroadcast } from "../hooks/useCrossTabSync.ts";
import { ApiError } from "../services/apiError.ts";
import { authService, type LoginInput, type RegisterInput } from "../services/authService.ts";
import type { AuthResult, CartAdjustment, User } from "../types/auth.ts";
import { AuthContext, authQueryKey } from "./useAuth.ts";

/** Dữ liệu cá nhân bị xoá khỏi cache khi đổi người dùng. */
const PRIVATE_KEYS = [["orders"], ["account"]] as const;

/** Task 4.1: user state lấy từ /api/user; KHÔNG giữ/persist token. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [cartAdjustments, setCartAdjustments] = useState<CartAdjustment[]>([]);

  const me = useQuery({
    queryKey: authQueryKey,
    queryFn: ({ signal }) => authService.me(signal),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const resetPrivate = useCallback(() => {
    for (const key of PRIVATE_KEYS) {
      queryClient.removeQueries({ queryKey: key });
    }
    void queryClient.invalidateQueries({ queryKey: cartQueryKey });
  }, [queryClient]);

  const signedOut = useCallback(() => {
    queryClient.setQueryData(authQueryKey, null);
    setCartAdjustments([]);
    resetPrivate();
  }, [queryClient, resetPrivate]);

  // 4.9: tab khác đăng nhập/đăng xuất → đồng bộ
  useAuthBroadcast(
    useCallback((type) => {
      if (type === "logout") {
        signedOut();
      } else {
        resetPrivate();
        void queryClient.invalidateQueries({ queryKey: authQueryKey });
      }
    }, [queryClient, resetPrivate, signedOut]),
  );

  // Phiên hết hạn: request nào trả 401 → về trạng thái khách (ProtectedRoute sẽ chuyển trang)
  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.query.queryHash === JSON.stringify(authQueryKey)) {
        return;
      }
      const error = event.query.state.error;
      if (error instanceof ApiError && error.status === 401 && queryClient.getQueryData(authQueryKey)) {
        signedOut();
      }
    });
  }, [queryClient, signedOut]);

  const signedIn = useCallback((result: AuthResult) => {
    resetPrivate();
    queryClient.setQueryData(authQueryKey, result.user);
    setCartAdjustments(result.cart_adjustments ?? []);
    notifyAuthChanged("login");
    return result;
  }, [queryClient, resetPrivate]);

  const login = useCallback(async (input: LoginInput) => signedIn(await authService.login(input)), [signedIn]);
  const register = useCallback(async (input: RegisterInput) => signedIn(await authService.register(input)), [signedIn]);
  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      signedOut();
      notifyAuthChanged("logout");
    }
  }, [signedOut]);

  const setUser = useCallback((user: User) => queryClient.setQueryData(authQueryKey, user), [queryClient]);
  const dismissCartAdjustments = useCallback(() => setCartAdjustments([]), []);

  const value = useMemo(() => ({
    user: me.data ?? null,
    isLoading: me.isPending,
    login,
    register,
    logout,
    setUser,
    cartAdjustments,
    dismissCartAdjustments,
  }), [me.data, me.isPending, login, register, logout, setUser, cartAdjustments, dismissCartAdjustments]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
