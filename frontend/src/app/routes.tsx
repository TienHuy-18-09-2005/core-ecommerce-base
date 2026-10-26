import type { ComponentType, ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { AdminRoute, LegacyProductRedirect } from "./routeParts.tsx";
import { RouteError } from "./RouteError.tsx";
import { ShopLayout } from "../layouts/ShopLayout.tsx";
import { ProtectedRoute } from "../components/common/ProtectedRoute.tsx";
import { HomePage } from "../pages/shop/HomePage.tsx";
import { DEFAULT_DESCRIPTION } from "../utils/seo.ts";
import { productsQueryOptions } from "../hooks/useCatalogQuery.ts";
import { parseCatalogParams, toApiParams } from "../utils/catalogParams.ts";
import { appQueryClient } from "./queryClient.ts";

/** Gọi API danh sách song song với tải chunk trang (không chặn điều hướng) → LCP sớm hơn. */
function prefetchProducts({ request }: { request: Request }) {
  const params = toApiParams(parseCatalogParams(new URL(request.url).searchParams));
  void appQueryClient.prefetchQuery(productsQueryOptions(params));
  return null;
}

/**
 * Tách mã theo trang (Pha 7.2): trang chủ + layout tải ngay, các trang còn lại
 * dùng `lazy` của React Router — router chờ chunk xong mới chuyển trang nên
 * không nháy fallback và không gây layout shift.
 */
function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType, wrap?: (el: ReactNode) => ReactNode) {
  return async () => {
    const C = pick(await load());
    return { element: wrap ? wrap(<C />) : <C /> };
  };
}

const guard = (el: ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

const INFO_TITLES: Record<string, string> = {
  "gioi-thieu": "Giới thiệu",
  "chinh-sach-van-chuyen": "Chính sách vận chuyển",
  "chinh-sach-doi-tra": "Chính sách đổi trả",
  "chinh-sach-bao-mat": "Chính sách bảo mật",
};

type InfoSlug = Parameters<typeof import("../pages/shop/InfoPage.tsx").InfoPage>[0]["slug"];

const info = (slug: InfoSlug): RouteObject => ({
  path: slug,
  handle: { seo: { title: INFO_TITLES[slug] } },
  lazy: async () => {
    const { InfoPage } = await import("../pages/shop/InfoPage.tsx");
    return { element: <InfoPage slug={slug} /> };
  },
});

export const appRoutes: RouteObject[] = [
  {
    element: <ShopLayout />,
    errorElement: <RouteError />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, handle: { seo: { description: DEFAULT_DESCRIPTION } }, element: <HomePage /> },
          { path: "san-pham", handle: { seo: "page" }, loader: prefetchProducts, lazy: page(() => import("../pages/shop/ProductList.tsx"), (m) => m.ProductList) },
          { path: "san-pham/:slug", handle: { seo: "page" }, lazy: page(() => import("../pages/shop/ProductDetail.tsx"), (m) => m.ProductDetail) },
          { path: "products/:slug", element: <LegacyProductRedirect /> },
          { path: "gio-hang", handle: { seo: { title: "Giỏ hàng", description: "Xem và chỉnh sửa giỏ hàng thiết bị điện của bạn.", noindex: true } }, lazy: page(() => import("../pages/shop/CartPage.tsx"), (m) => m.CartPage) },
          { path: "thanh-toan", handle: { seo: { title: "Thanh toán", description: "Hoàn tất đơn hàng: nhập địa chỉ giao hàng và chọn phương thức thanh toán.", noindex: true } }, lazy: page(() => import("../pages/shop/CheckoutPage.tsx"), (m) => m.CheckoutPage) },
          { path: "dat-hang-thanh-cong/:code", handle: { seo: { title: "Đặt hàng thành công", noindex: true } }, lazy: page(() => import("../pages/shop/OrderSuccess.tsx"), (m) => m.OrderSuccess) },
          { path: "tra-cuu-don-hang", handle: { seo: { title: "Tra cứu đơn hàng", description: "Tra cứu tình trạng đơn hàng bằng mã đơn và số điện thoại." } }, lazy: page(() => import("../pages/shop/OrderLookupPage.tsx"), (m) => m.OrderLookupPage) },
          { path: "dang-nhap", handle: { seo: { title: "Đăng nhập", description: "Đăng nhập tài khoản Core Điện để theo dõi đơn hàng." } }, lazy: page(() => import("../pages/shop/LoginPage.tsx"), (m) => m.LoginPage) },
          { path: "dang-ky", handle: { seo: { title: "Đăng ký", description: "Tạo tài khoản Core Điện để mua sắm nhanh hơn." } }, lazy: page(() => import("../pages/shop/RegisterPage.tsx"), (m) => m.RegisterPage) },
          { path: "quen-mat-khau", handle: { seo: { title: "Quên mật khẩu", noindex: true } }, lazy: page(() => import("../pages/shop/ForgotPasswordPage.tsx"), (m) => m.ForgotPasswordPage) },
          { path: "dat-lai-mat-khau", handle: { seo: { title: "Đặt lại mật khẩu", noindex: true } }, lazy: page(() => import("../pages/shop/ResetPasswordPage.tsx"), (m) => m.ResetPasswordPage) },
          { path: "xac-thuc-email", handle: { seo: { title: "Xác thực email", noindex: true } }, lazy: page(() => import("../pages/shop/VerifyEmailPage.tsx"), (m) => m.VerifyEmailPage) },
          { path: "tai-khoan", handle: { seo: { title: "Tài khoản của tôi", noindex: true } }, lazy: page(() => import("../pages/shop/AccountPage.tsx"), (m) => m.AccountPage, guard) },
          { path: "tai-khoan/don-hang/:code", handle: { seo: { title: "Chi tiết đơn hàng", noindex: true } }, lazy: page(() => import("../pages/shop/OrderTracking.tsx"), (m) => m.OrderTracking, guard) },
          info("gioi-thieu"),
          info("chinh-sach-van-chuyen"),
          info("chinh-sach-doi-tra"),
          info("chinh-sach-bao-mat"),
          { path: "*", handle: { seo: "page" }, lazy: page(() => import("../pages/shop/NotFound.tsx"), (m) => m.NotFound) },
        ],
      },
    ],
  },
  { path: "admin/*", element: <AdminRoute />, errorElement: <RouteError /> },
];
