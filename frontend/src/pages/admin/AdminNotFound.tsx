import { Link } from "react-router-dom";
import { Seo } from "../../components/common/Seo.tsx";

export default function AdminNotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <Seo title="Không tìm thấy trang" noindex />
      <p className="text-5xl font-bold text-admin-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold text-admin-fg">Không tìm thấy trang quản trị</h1>
      <p className="mt-2 text-sm text-admin-muted">Đường dẫn bạn mở không tồn tại hoặc đã được đổi.</p>
      <Link to="/admin" className="mt-6 rounded-lg bg-admin-primary px-4 py-2 text-sm font-semibold text-admin-on-primary hover:bg-admin-primary-hover">
        Về trang tổng quan
      </Link>
    </section>
  );
}
