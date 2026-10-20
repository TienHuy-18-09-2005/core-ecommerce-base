import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./app/ErrorBoundary.tsx";
import { useCartQuery } from "./hooks/useCartQuery.ts";
import { ProductDetail } from "./pages/shop/ProductDetail.tsx";
import { cartItemCount } from "./types/cart.ts";

function CartSummary() {
  const cart = useCartQuery();
  const count = cartItemCount(cart.data);

  let label = String(count);
  if (cart.isLoading) {
    label = "…";
  } else if (cart.isError) {
    label = "—";
  }

  return (
    <p className="text-sm text-gray-600" aria-live="polite">
      Giỏ hàng: <span className="font-semibold text-gray-900">{label}</span>
    </p>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="mb-6 flex items-center justify-between bg-white px-6 py-4 shadow-sm">
          <h1 className="text-xl font-bold text-blue-600">Core E-commerce - Thiết Bị Điện</h1>
          <CartSummary />
        </header>
        <main>
          <ErrorBoundary>
            <Routes>
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route
                path="/"
                element={
                  <div className="py-12 text-center">
                    <h2 className="text-2xl font-semibold text-gray-800">
                      Chào mừng đến với hệ thống bán Thiết bị điện
                    </h2>
                    <p className="mt-2 text-gray-500">
                      Vui lòng truy cập đường dẫn sản phẩm, ví dụ:{" "}
                      <code className="rounded bg-gray-200 px-2 py-1">
                        /products/den-led-panel-tron-rang-dong
                      </code>
                    </p>
                  </div>
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
