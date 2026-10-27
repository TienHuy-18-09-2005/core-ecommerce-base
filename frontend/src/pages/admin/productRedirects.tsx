import { Navigate, useParams } from "react-router-dom";

/** Đường dẫn cũ /admin/san-pham/moi và /admin/san-pham/:id → danh sách với modal mở sẵn. */
export function ProductCreateRedirect() {
  return <Navigate to="/admin/san-pham?them=1" replace />;
}

export function ProductEditRedirect() {
  const { id = "" } = useParams();
  return <Navigate to={/^\d+$/.test(id) ? `/admin/san-pham?sua=${id}` : "/admin/san-pham"} replace />;
}
