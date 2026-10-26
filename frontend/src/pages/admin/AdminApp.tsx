import { NavLink, Route, Routes, Link } from "react-router-dom";
import { useAuth } from "../../app/useAuth.ts";
import DashboardPage from "./DashboardPage.tsx";
import ProductsPage from "./ProductsPage.tsx";
import ProductFormPage from "./ProductFormPage.tsx";
import OrdersPage from "./OrdersPage.tsx";
import OrderDetailPage from "./OrderDetailPage.tsx";
import CategoriesPage from "./CategoriesPage.tsx";
import CouponsPage from "./CouponsPage.tsx";
import ReviewsPage from "./ReviewsPage.tsx";

import SettingsPage from "./SettingsPage.tsx";
const NAV = [
  { to: "/admin", label: "Tổng quan", end: true },
  { to: "/admin/san-pham", label: "Sản phẩm" },
  { to: "/admin/don-hang", label: "Đơn hàng" },
  { to: "/admin/danh-muc", label: "Danh mục" },
  { to: "/admin/ma-giam-gia", label: "Mã giảm giá" },
  { to: "/admin/danh-gia", label: "Đánh giá" },
  { to: "/admin/cai-dat", label: "Cài đặt" },
];

export default function AdminApp() {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-56 shrink-0 bg-slate-900 text-slate-200 md:block">
        <div className="px-5 py-5 text-lg font-bold text-white">Quản trị</div>
        <nav aria-label="Menu quản trị" className="flex flex-col gap-1 px-3">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `rounded-lg px-3 py-2 text-sm ${isActive ? "bg-slate-700 font-semibold text-white" : "hover:bg-slate-800"}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
          <Link to="/" className="text-sm font-medium text-blue-700">← Về cửa hàng</Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">{user?.name}</span>
            <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => void logout()}>Đăng xuất</button>
          </div>
        </header>
        <nav aria-label="Menu quản trị (di động)" className="flex gap-4 overflow-x-auto border-b bg-white px-6 py-2 text-sm md:hidden">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className="whitespace-nowrap">{n.label}</NavLink>)}
        </nav>
        <main className="p-6">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="san-pham" element={<ProductsPage />} />
            <Route path="san-pham/moi" element={<ProductFormPage />} />
            <Route path="san-pham/:id" element={<ProductFormPage />} />
            <Route path="don-hang" element={<OrdersPage />} />
            <Route path="don-hang/:id" element={<OrderDetailPage />} />
            <Route path="danh-muc" element={<CategoriesPage />} />
            <Route path="ma-giam-gia" element={<CouponsPage />} />
            <Route path="danh-gia" element={<ReviewsPage />} />
            <Route path="cai-dat" element={<SettingsPage />} />
            <Route path="*" element={<p>Không tìm thấy trang quản trị.</p>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
