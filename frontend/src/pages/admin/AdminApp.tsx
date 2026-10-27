import type { ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useCan, type Permission } from "../../hooks/useCan.ts";
import AdminForbidden from "./AdminForbidden.tsx";
import { Seo } from "../../components/common/Seo.tsx";
import { AdminLayout } from "../../components/admin/layout/AdminLayout.tsx";
import AdminNotFound from "./AdminNotFound.tsx";
import { ADMIN_ROUTES, firstAllowedHref } from "./adminRoutes.ts";

/** Chặn route theo quyền (chỉ UX — server vẫn trả 403). Trang chủ admin chuyển sang mục đầu tiên được phép. */
function Guard({ page: Page, permission, index }: { page: ComponentType; permission: Permission; index?: boolean }) {
  const can = useCan();
  if (can(permission)) return <Page />;
  const first = index ? firstAllowedHref(can) : null;
  return first && first !== "/admin" ? <Navigate to={first} replace /> : <AdminForbidden />;
}

export default function AdminApp() {
  return (
    <AdminLayout>
      <Seo title="Quản trị" noindex />
      <Routes>
        {ADMIN_ROUTES.filter((r) => r.component).flatMap((r) => {
          const Page = r.component!;
          const base = r.path;
          return [
            base === "" ? <Route key="index" index element={<Guard page={Page} permission={r.permission} index />} />
              : <Route key={base} path={base} element={<Guard page={Page} permission={r.permission} />} />,
            ...(r.children ?? []).map((c) => <Route key={`${base}/${c.path}`} path={`${base}/${c.path}`} element={<Guard page={c.component} permission={c.permission ?? r.permission} />} />),
          ];
        })}
        <Route path="*" element={<AdminNotFound />} />
      </Routes>
    </AdminLayout>
  );
}
