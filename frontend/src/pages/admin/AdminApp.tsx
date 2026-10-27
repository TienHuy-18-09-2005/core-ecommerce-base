import { Route, Routes } from "react-router-dom";
import { Seo } from "../../components/common/Seo.tsx";
import { AdminLayout } from "../../components/admin/layout/AdminLayout.tsx";
import AdminNotFound from "./AdminNotFound.tsx";
import { ADMIN_ROUTES } from "./adminRoutes.ts";

export default function AdminApp() {
  return (
    <AdminLayout>
      <Seo title="Quản trị" noindex />
      <Routes>
        {ADMIN_ROUTES.filter((r) => r.component).flatMap((r) => {
          const Page = r.component!;
          const base = r.path;
          return [
            base === "" ? <Route key="index" index element={<Page />} /> : <Route key={base} path={base} element={<Page />} />,
            ...(r.children ?? []).map((c) => <Route key={`${base}/${c.path}`} path={`${base}/${c.path}`} element={<c.component />} />),
          ];
        })}
        <Route path="*" element={<AdminNotFound />} />
      </Routes>
    </AdminLayout>
  );
}
