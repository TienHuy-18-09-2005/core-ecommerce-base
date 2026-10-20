import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProductDetail } from './pages/shop/ProductDetail';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm py-4 px-6 mb-6">
          <h1 className="text-xl font-bold text-blue-600">Core E-commerce - Thiết Bị Điện</h1>
        </header>
        <main>
          <Routes>
            {/* Định tuyến thử nghiệm trang chi tiết sản phẩm với slug mẫu */}
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/" element={
              <div className="text-center py-12">
                <h2 className="text-2xl font-semibold text-gray-800">Chào mừng đến với hệ thống bán Thiết bị điện</h2>
                <p className="text-gray-500 mt-2">Vui lòng truy cập đường dẫn sản phẩm, ví dụ: <code className="bg-gray-200 px-2 py-1 rounded">/products/den-led-panel-tron-rang-dong</code></p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;