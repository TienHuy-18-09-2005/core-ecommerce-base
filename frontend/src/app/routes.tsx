import type { RouteObject } from "react-router-dom";
import { AdminRoute, LegacyProductRedirect } from "./routeParts.tsx";
import { ShopLayout } from "../layouts/ShopLayout.tsx";
import { CartPage } from "../pages/shop/CartPage.tsx";
import { HomePage } from "../pages/shop/HomePage.tsx";
import { InfoPage } from "../pages/shop/InfoPage.tsx";
import { LoginPage } from "../pages/shop/LoginPage.tsx";
import { NotFound } from "../pages/shop/NotFound.tsx";
import { ProductDetail } from "../pages/shop/ProductDetail.tsx";
import { ProductList } from "../pages/shop/ProductList.tsx";

export const appRoutes: RouteObject[] = [
  {
    element: <ShopLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "san-pham", element: <ProductList /> },
      { path: "san-pham/:slug", element: <ProductDetail /> },
      { path: "products/:slug", element: <LegacyProductRedirect /> },
      { path: "gio-hang", element: <CartPage /> },
      { path: "dang-nhap", element: <LoginPage /> },
      { path: "gioi-thieu", element: <InfoPage slug="gioi-thieu" /> },
      { path: "chinh-sach-van-chuyen", element: <InfoPage slug="chinh-sach-van-chuyen" /> },
      { path: "chinh-sach-doi-tra", element: <InfoPage slug="chinh-sach-doi-tra" /> },
      { path: "chinh-sach-bao-mat", element: <InfoPage slug="chinh-sach-bao-mat" /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  { path: "admin/*", element: <AdminRoute /> },
];
