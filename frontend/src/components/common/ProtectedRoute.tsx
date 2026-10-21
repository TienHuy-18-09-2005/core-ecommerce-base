import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/useAuth.ts";

/** Task 4.7: chỉ là UX — quyền thật luôn kiểm ở server (auth:sanctum, Policy). */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p aria-busy="true">Đang kiểm tra phiên đăng nhập...</p>;
  }
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/dang-nhap?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return <>{children}</>;
}
