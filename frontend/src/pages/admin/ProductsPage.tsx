import { Link } from "react-router-dom";
import { PRODUCT_STATUS_LABELS, btnDanger, btnPrimary, inputClass } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { useAdminCategoriesQuery, useAdminProductsQuery, useProductMutations } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

export default function ProductsPage() {
  const { values, page, set, setPage, sort, toggleSort, sortParams } = useListParams(["q", "status", "category_id", "low_stock"] as const);
  const { data, error, isLoading } = useAdminProductsQuery({ ...values, ...sortParams, page });
  const categories = useAdminCategoriesQuery();
  const { remove } = useProductMutations();
  const toast = useToast();

  const onDelete = (id: number, name: string) => {
    if (!window.confirm(`Xóa sản phẩm "${name}"? Đơn hàng cũ vẫn giữ nguyên thông tin.`)) {
      return;
    }
    remove.mutate(id, { onSuccess: () => toast.showSuccess("Đã xóa sản phẩm."), onError: toast.showError });
  };

  return (
    <>
      <PageHeader title="Sản phẩm" actions={<Link to="/admin/san-pham/moi" className={btnPrimary}>+ Thêm sản phẩm</Link>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <input aria-label="Tìm sản phẩm" placeholder="Tên hoặc SKU..." className={inputClass} defaultValue={values.q}
          onKeyDown={(e) => { if (e.key === "Enter") set("q", e.currentTarget.value.trim()); }}
          onBlur={(e) => set("q", e.currentTarget.value.trim())} />
        <select aria-label="Trạng thái" className={inputClass} value={values.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">Mọi trạng thái</option>
          {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Danh mục" className={inputClass} value={values.category_id} onChange={(e) => set("category_id", e.target.value)}>
          <option value="">Mọi danh mục</option>
          {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.low_stock === "1"} onChange={(e) => set("low_stock", e.target.checked ? "1" : "")} />
          Chỉ sắp hết hàng
        </label>
      </div>
      <QueryError error={error} />
      <DataTable sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(p) => p.id} empty="Không có sản phẩm phù hợp." columns={[
        { header: "Sản phẩm", sortKey: "name", cell: (p) => (
          <div className="flex items-center gap-3">
            <img src={safeImageUrl(p.thumbnail_url) ?? "/product-fallback.svg"} alt="" loading="lazy" decoding="async" width={40} height={40} className="h-10 w-10 rounded object-cover" />
            <div>
              <Link to={`/admin/san-pham/${p.id}`} className="font-medium text-blue-700">{p.name}</Link>
              <p className="text-xs text-slate-500">{p.brand?.name ?? "—"} · {p.categories.map((c) => c.name).join(", ") || "Chưa phân loại"}</p>
            </div>
          </div>
        ) },
        { header: "Giá từ", sortKey: "price_min", cell: (p) => formatCurrency(p.price_min) },
        { header: "Tồn kho", sortKey: "stock_total", cell: (p) => <span className={p.stock_total <= 5 ? "font-semibold text-red-600" : ""}>{p.stock_total} ({p.variants_count} biến thể)</span> },
        { header: "Trạng thái", sortKey: "status", cell: (p) => PRODUCT_STATUS_LABELS[p.status] ?? p.status },
        { header: "Thao tác", cell: (p) => (
          <div className="flex gap-2">
            <Link to={`/admin/san-pham/${p.id}`} className="text-sm text-blue-700">Sửa</Link>
            <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => onDelete(p.id, p.name)}>Xóa</button>
          </div>
        ) },
      ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
