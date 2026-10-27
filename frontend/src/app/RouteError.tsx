import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { isChunkLoadError } from "../utils/chunkError.ts";

/**
 * errorElement cho data router: lỗi render/loader trong route bị React Router bắt
 * TRƯỚC ErrorBoundary gốc, nên cần màn hình lỗi tiếng Việt riêng ở đây.
 */
export function RouteError() {
  const error = useRouteError();
  const chunk = isChunkLoadError(error);
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  if (!notFound) {
    console.error(error);
  }

  return (
    <div role="alert" className="mx-auto my-10 max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center">
      <title>Đã có lỗi — Đồ Điện Siêu Xịn</title>
      <h1 className="text-xl font-bold text-slate-900">
        {notFound ? "Không tìm thấy trang" : chunk ? "Đã có phiên bản mới" : "Đã có lỗi xảy ra"}
      </h1>
      <p className="mt-2 text-slate-600">
        {chunk
          ? "Trang web vừa được cập nhật. Vui lòng tải lại để dùng phiên bản mới nhất."
          : "Không thể hiển thị trang này. Bạn thử tải lại hoặc quay về trang chủ."}
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Tải lại trang
        </button>
        <Link to="/" reloadDocument className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Về trang chủ</Link>
      </div>
    </div>
  );
}
