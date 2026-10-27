import { useModalParam } from "../../hooks/useModalParam.ts";
import { ProductFormModal } from "./ProductFormModal.tsx";
import { PRODUCT_STATUS_LABELS, btnDanger, btnPrimary } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { ProductStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { FilterChips, SavedViews, SearchBox, type FilterDef } from "../../components/admin/table/FilterBar.tsx";
import { useSelection } from "../../components/admin/table/useSelection.ts";
import { bulkMessage } from "../../components/admin/table/bulkMessage.ts";
import { useAdminCategoriesQuery, useAdminProductsQuery, useBulkAction, useProductMutations } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { adminService } from "../../services/adminService.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

const KEYS = ["q", "status", "category_id", "low_stock"] as const;
const PRESETS = [
  { name: "Hàng sắp hết", query: "low_stock=1" },
  { name: "Bản nháp", query: "status=draft" },
];

export default function ProductsPage() {
  const modal = useModalParam();
  const { values, page, set, setMany, setPage, sort, toggleSort, sortParams, query, applyQuery } = useListParams(KEYS);
  const { data, error, isLoading, refetch, isRefetching } = useAdminProductsQuery({ ...values, ...sortParams, page });
  const confirm = useConfirm();
  const categories = useAdminCategoriesQuery();
  const { remove } = useProductMutations();
  const bulkDelete = useBulkAction((id: number) => adminService.deleteProduct(id));
  const toast = useToast();
  const selection = useSelection((data?.data ?? []).map((p) => p.id), `${query}|${page}`);

  const filters: FilterDef[] = [
    { key: "status", label: "Trạng thái", type: "select", options: Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
    { key: "category_id", label: "Danh mục", type: "select", options: (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
    { key: "low_stock", label: "Sắp hết hàng", type: "toggle" },
  ];

  const onDelete = async (id: number, name: string) => {
    if (!(await confirm({ title: "Xóa sản phẩm?", message: `Sản phẩm "${name}" sẽ bị xóa. Đơn hàng cũ vẫn giữ nguyên thông tin.`, confirmLabel: "Xóa", danger: true }))) {
      return;
    }
    remove.mutate(id, { onSuccess: () => toast.showSuccess("Đã xóa sản phẩm."), onError: toast.showError });
  };

  const onBulkDelete = async () => {
    const ids = selection.ids as number[];
    if (!(await confirm({ title: `Xóa ${ids.length} sản phẩm?`, message: "Các sản phẩm đã chọn sẽ bị xóa. Đơn hàng cũ vẫn giữ nguyên thông tin.", confirmLabel: "Xóa", danger: true }))) return;
    bulkDelete.mutate(ids, {
      onSuccess: (r) => { (r.failed ? toast.showError : toast.showSuccess)(bulkMessage(r, "Đã xóa", "sản phẩm")); selection.clear(); },
    });
  };

  return (
    <>
      <PageHeader title="Sản phẩm" actions={<button type="button" onClick={modal.openCreate} className={btnPrimary}>+ Thêm sản phẩm</button>} />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="products" sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(p) => p.id} empty="Không có sản phẩm phù hợp."
        selection={selection} rowLabel={(p) => p.name}
        toolbar={<>
          <SearchBox label="Tìm sản phẩm" placeholder="Tên hoặc SKU..." value={values.q} onChange={(v) => set("q", v)} />
          <FilterChips filters={filters} values={values} onChange={(k, v) => set(k as (typeof KEYS)[number], v)} onClear={() => setMany({ status: "", category_id: "", low_stock: "" })} />
          <SavedViews tableId="products" presets={PRESETS} query={query} onApply={applyQuery} />
        </>}
        bulkActions={<button type="button" className={btnDanger} disabled={bulkDelete.isPending} onClick={() => void onBulkDelete()}>{bulkDelete.isPending ? "Đang xóa..." : "Xóa đã chọn"}</button>}
        columns={[
          { header: "Sản phẩm", sortKey: "name", hideable: false, cell: (p) => (
            <div className="flex items-center gap-3">
              <img src={safeImageUrl(p.thumbnail_url) ?? "/product-fallback.svg"} alt="" loading="lazy" decoding="async" width={40} height={40} className="h-10 w-10 rounded object-cover" />
              <div>
                <button type="button" onClick={() => modal.openEdit(p.id)} className="text-left font-medium text-admin-primary hover:underline">{p.name}</button>
                <p className="text-xs text-admin-muted">{p.brand?.name ?? "—"} · {p.categories.map((c) => c.name).join(", ") || "Chưa phân loại"}</p>
              </div>
            </div>
          ) },
          { header: "Giá từ", sortKey: "price_min", align: "right", cell: (p) => formatCurrency(p.price_min) },
          { header: "Tồn kho", sortKey: "stock_total", align: "right", cell: (p) => <span className={p.stock_total <= 5 ? "font-semibold text-admin-danger" : ""}>{p.stock_total} ({p.variants_count} biến thể)</span> },
          { header: "Trạng thái", sortKey: "status", cell: (p) => <ProductStatusBadge status={p.status} /> },
          { header: "Thao tác", hideable: false, cell: (p) => (
            <div className="flex gap-2">
              <button type="button" onClick={() => modal.openEdit(p.id)} aria-label={`Sửa sản phẩm ${p.name}`} className="text-sm text-admin-primary">Sửa</button>
              <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => void onDelete(p.id, p.name)}>Xóa</button>
            </div>
          ) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {modal.mode && <ProductFormModal key={modal.editId ?? "new"} id={modal.editId} onClose={modal.close} />}
    </>
  );
}
