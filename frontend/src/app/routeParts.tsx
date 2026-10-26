import { lazy, Suspense } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "../components/common/ProtectedRoute.tsx";
import { useAuth } from "./useAuth.ts";

// Bundle admin tách riêng: khách/khách hàng không tải mã quản trị.
const AdminApp = lazy(() => import("../pages/admin/AdminApp.tsx"));

export function LegacyProductRedirect() {
  const params = useParams();
  return <Navigate to={`/san-pham/${params.slug ?? ""}`} replace />;
}

function AdminForbidden() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Không có quyền truy cập</h1>
        <p className="mt-3 text-slate-600">Tài khoản của bạn không có quyền vào khu vực quản trị.</p>
        <Link to="/" className="mt-6 inline-flex font-semibold text-blue-700">Về cửa hàng</Link>
      </div>
    </main>
  );
}

/** Chỉ là UX — quyền thật kiểm ở server (Gate admin + Policy trên từng route). */
function AdminGuard() {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <AdminForbidden />;
  }
  return (
    <Suspense fallback={<p className="p-8">Đang tải khu vực quản trị...</p>}>
      <AdminApp />
    </Suspense>
  );
}

export function AdminRoute() {
  return (
    <ProtectedRoute>
      <AdminGuard />
    </ProtectedRoute>
  );
}
