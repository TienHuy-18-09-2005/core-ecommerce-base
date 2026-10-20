import { Link } from "react-router-dom";

export default function AdminHome() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">Khu vực quản trị</h1>
        <p className="mt-3 text-slate-600">
          Trang này được tải riêng. Mọi thao tác ghi dữ liệu vẫn yêu cầu phiên admin trên máy chủ.
        </p>
        <Link to="/" className="mt-6 inline-flex font-semibold text-blue-700">Về cửa hàng</Link>
      </div>
    </main>
  );
}
