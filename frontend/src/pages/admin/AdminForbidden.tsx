import { ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "../../components/common/Seo.tsx";
import { useCan } from "../../hooks/useCan.ts";
import { firstAllowedHref } from "./adminRoutes.ts";

/** 403 trong khu quản trị: có vào admin nhưng thiếu quyền cho trang này. */
export default function AdminForbidden() {
  const can = useCan();
  const home = firstAllowedHref(can);
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <Seo title="Không có quyền truy cập" noindex />
      <ShieldOff aria-hidden className="size-10 text-admin-danger" />
      <p className="mt-3 text-5xl font-bold text-admin-primary">403</p>
      <h1 className="mt-4 text-xl font-semibold text-admin-fg">Bạn không có quyền xem trang này</h1>
      <p className="mt-2 text-sm text-admin-muted">Vai trò của bạn chưa được cấp quyền cho chức năng này. Hãy liên hệ quản trị viên nếu cần.</p>
      {home && (
        <Link to={home} className="mt-6 rounded-lg bg-admin-primary px-4 py-2 text-sm font-semibold text-admin-on-primary hover:bg-admin-primary-hover">
          Về trang được phép
        </Link>
      )}
    </section>
  );
}
