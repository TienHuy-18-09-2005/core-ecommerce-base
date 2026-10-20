import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <section aria-labelledby="dang-nhap" className="mx-auto max-w-lg rounded-2xl bg-white p-8">
      <h1 id="dang-nhap" className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
      <p className="mt-3 text-slate-600">
        Cửa hàng dùng cookie phiên. Form đăng nhập sẽ mở khi API tài khoản sẵn sàng. Quyền quản trị vẫn được kiểm tra trên máy chủ.
      </p>
      <Link to="/" className="mt-6 inline-flex font-semibold text-blue-700">Về trang chủ</Link>
    </section>
  );
}
