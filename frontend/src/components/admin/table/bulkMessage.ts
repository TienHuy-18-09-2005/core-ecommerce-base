import type { BulkResult } from "../../../hooks/useAdminQuery.ts";

/** "Đã xóa 3 sản phẩm." / "Đã xóa 2/3 sản phẩm, 1 mục lỗi." */
export function bulkMessage(r: BulkResult, verb: string, noun: string) {
  return r.failed === 0 ? `${verb} ${r.ok} ${noun}.` : `${verb} ${r.ok}/${r.total} ${noun}, ${r.failed} mục lỗi.`;
}
