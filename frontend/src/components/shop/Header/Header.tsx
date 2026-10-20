import { Menu, ShoppingCart, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCategoriesQuery } from "../../../hooks/useCatalogQuery.ts";
import { useCartQuery } from "../../../hooks/useCartQuery.ts";
import { SearchAutocomplete } from "./SearchAutocomplete.tsx";
import { featuredDepartments } from "../../../types/catalog.ts";
import { cartItemCount } from "../../../types/cart.ts";

export function Header() {
  const cart = useCartQuery();
  const categories = useCategoriesQuery();
  const [menuOpen, setMenuOpen] = useState(false);
  const count = cartItemCount(cart.data);
  const departments = featuredDepartments(categories.data ?? []);

  let cartLabel = String(count);
  if (cart.isLoading) {
    cartLabel = "…";
  } else if (cart.isError) {
    cartLabel = "—";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="text-lg font-bold text-blue-700">
          Core Điện
        </Link>
        <SearchAutocomplete />
        <Link
          to="/gio-hang"
          className="ml-auto inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-800 md:ml-0"
          aria-live="polite"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          Giỏ hàng
          <span className="min-w-6 rounded-full bg-amber-500 px-2 text-center text-slate-900">{cartLabel}</span>
        </Link>
        <Link to="/dang-nhap" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-800">
          <UserRound className="h-5 w-5" aria-hidden="true" />
          Đăng nhập
        </Link>
      </div>
      <nav aria-label="Danh mục" className="border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-800 md:hidden"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
            Danh mục
          </button>
          {categories.isLoading ? <p className="py-2 text-sm text-slate-500">Đang tải danh mục...</p> : null}
          {categories.isError ? (
            <p role="alert" className="py-2 text-sm text-red-700">
              Không tải được danh mục.{" "}
              <button type="button" className="font-semibold underline" onClick={() => categories.refetch()}>
                Thử lại
              </button>
            </p>
          ) : null}
          {categories.isSuccess && departments.length === 0 ? (
            <p className="py-2 text-sm text-slate-500">Chưa có danh mục.</p>
          ) : null}
          {categories.isSuccess && departments.length > 0 ? (
            <ul className={`${menuOpen ? "mt-2 flex" : "hidden"} flex-col gap-1 md:mt-0 md:flex md:flex-row md:flex-wrap md:gap-2`}>
              {departments.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/san-pham?category_id=${category.id}`}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    onClick={() => setMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
