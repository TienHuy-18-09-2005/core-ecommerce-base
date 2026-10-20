import { Outlet } from "react-router-dom";
import { Footer } from "../components/shop/Footer.tsx";
import { Header } from "../components/shop/Header/Header.tsx";

export function ShopLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <a
        href="#noi-dung"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Đi tới nội dung
      </a>
      <Header />
      <main id="noi-dung" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
