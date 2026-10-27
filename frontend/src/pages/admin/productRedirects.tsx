import { Navigate } from "react-router-dom";

/** Đường dẫn cũ /admin/san-pham/moi → danh sách với modal thêm mở sẵn. (/admin/san-pham/:id giờ là trang chi tiết.) */
export function ProductCreateRedirect() {
  return <Navigate to="/admin/san-pham?them=1" replace />;
}
