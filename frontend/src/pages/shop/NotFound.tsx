import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "../../components/common/Seo.tsx";

const SUGGESTIONS = [
  { to: "/san-pham", label: "Tất cả sản phẩm" },
  { to: "/tra-cuu-don-hang", label: "Tra cứu đơn hàng" },
  { to: "/gio-hang", label: "Giỏ hàng" },
  { to: "/gioi-thieu", label: "Giới thiệu cửa hàng" },
];

/** Trang 404 tiếng Việt: gợi ý tìm kiếm + đường dẫn hay dùng, không cho index. */
export function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const search = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/san-pham?search=${encodeURIComponent(term)}` : "/san-pham");
  };

  return (
    <section className="animate-fade-in mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm sm:p-12">
      <Seo title="Không tìm thấy trang" description="Trang bạn tìm không tồn tại trên Core Điện." noindex />
      <p className="text-6xl font-black tracking-tight text-blue-600" aria-hidden="true">404</p>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Không tìm thấy trang</h1>
      <p className="mt-3 text-slate-600">
        Đường dẫn <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-sm">{location.pathname}</code> không có trên cửa hàng.
        Có thể trang đã bị chuyển hoặc bạn gõ nhầm địa chỉ.
      </p>
      <form onSubmit={search} role="search" className="mx-auto mt-6 flex max-w-md gap-2">
        <label htmlFor="tim-404" className="sr-only">Tìm sản phẩm</label>
        <input
          id="tim-404"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm đèn LED, dây cáp, công tắc..."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Tìm</button>
      </form>
      <nav aria-label="Gợi ý" className="mt-8">
        <ul className="flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s.to}><Link to={s.to} className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:border-blue-300 hover:text-blue-700">{s.label}</Link></li>
          ))}
        </ul>
      </nav>
      <Link to="/" className="mt-8 inline-flex rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">Về trang chủ</Link>
    </section>
  );
}
