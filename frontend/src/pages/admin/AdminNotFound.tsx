import { Link } from "react-router-dom";
import { Seo } from "../../components/common/Seo.tsx";

export default function AdminNotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <Seo title="Không tìm thấy trang" noindex />
      <p className="text-5xl font-bold text-blue-600">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Không tìm thấy trang quản trị</h1>
      <p className="mt-2 text-sm text-slate-500">Đường dẫn bạn mở không tồn tại hoặc đã được đổi.</p>
      <Link to="/admin" className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        Về trang tổng quan
      </Link>
    </section>
  );
}
