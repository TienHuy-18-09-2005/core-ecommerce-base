import { lazy, Suspense } from "react";
import { Navigate, useParams } from "react-router-dom";

const AdminHome = lazy(() => import("../pages/admin/AdminHome.tsx"));

export function LegacyProductRedirect() {
  const params = useParams();
  return <Navigate to={`/san-pham/${params.slug ?? ""}`} replace />;
}

export function AdminRoute() {
  return (
    <Suspense fallback={<p className="p-8">Đang tải khu vực quản trị...</p>}>
      <AdminHome />
    </Suspense>
  );
}
