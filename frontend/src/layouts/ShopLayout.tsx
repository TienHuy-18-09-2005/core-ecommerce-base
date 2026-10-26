import { Outlet, useLocation } from "react-router-dom";
import { CartDrawerProvider } from "../app/CartDrawerProvider.tsx";
import { CartAdjustmentNotice } from "../components/shop/CartAdjustmentNotice.tsx";
import { EmailVerificationBanner } from "../components/shop/EmailVerificationBanner.tsx";
import { CartDrawer } from "../components/shop/cart/CartDrawer.tsx";
import { Footer } from "../components/shop/Footer.tsx";
import { Header } from "../components/shop/Header/Header.tsx";
import { RouteSeo } from "../components/common/Seo.tsx";
import { useCrossTabSync } from "../hooks/useCrossTabSync.ts";

export function ShopLayout() {
  useCrossTabSync();
  const { pathname } = useLocation();

  return (
    <CartDrawerProvider>
      <RouteSeo />
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
        <a
          href="#noi-dung"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
        >
          Đi tới nội dung
        </a>
        <Header />
        <main id="noi-dung" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          <EmailVerificationBanner />
          <CartAdjustmentNotice />
          {/* Hiệu ứng vào trang nhẹ bằng CSS (tắt khi prefers-reduced-motion) */}
          <div key={pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>
        <Footer />
        <CartDrawer />
      </div>
    </CartDrawerProvider>
  );
}
