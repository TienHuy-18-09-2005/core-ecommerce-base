import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="rounded-2xl bg-white p-8 text-center">
      <p className="text-sm font-semibold text-blue-700">404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Không tìm thấy trang</h1>
      <p className="mt-3 text-slate-600">Đường dẫn này không có trên cửa hàng.</p>
      <Link to="/" className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">
        Về trang chủ
      </Link>
    </section>
  );
}
