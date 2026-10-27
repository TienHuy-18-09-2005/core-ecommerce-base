import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useModalParam } from "../../hooks/useModalParam.ts";
import { ProductFormModal } from "./ProductFormModal.tsx";
import { PRODUCT_STATUS_LABELS, btnDanger, btnPrimary, btnSecondary, formatDateTime, inputClass } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { Modal, useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { ProductStatusBadge } from "../../components/admin/Badge.tsx";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { FilterChips, SavedViews, SearchBox, type FilterDef } from "../../components/admin/table/FilterBar.tsx";
import { Popover } from "../../components/admin/table/Popover.tsx";
import { useSelection } from "../../components/admin/table/useSelection.ts";
import { bulkMessage } from "../../components/admin/table/bulkMessage.ts";
import { useAdminCategoriesQuery, useAdminProductsQuery, useBulkAction, useProductMutations } from "../../hooks/useAdminQuery.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import { adminService } from "../../services/adminService.ts";
import { productService } from "../../services/productService.ts";
import type { AdminProductRow, BulkProductInput, BulkProductResult } from "../../types/admin.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { Copy, Eye, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { IconActions, IconButton } from "../../components/admin/ui/IconButton.tsx";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

const LOW_STOCK = 5;
type BulkBody = BulkProductInput extends infer T ? (T extends BulkProductInput ? Omit<T, "ids"> : never) : never;
const KEYS = ["q", "status", "category_id", "brand_id", "low_stock"] as const;
const PRESETS = [
  { name: "Hàng sắp hết", query: "low_stock=1" },
  { name: "Bản nháp", query: "status=draft" },
];

const priceRange = (p: AdminProductRow) =>
  p.price_min === null ? "—" : p.price_max !== null && p.price_max !== p.price_min ? `${formatCurrency(p.price_min)} – ${formatCurrency(p.price_max)}` : formatCurrency(p.price_min);

export default function ProductsPage() {
  const modal = useModalParam();
  const { values, page, set, setMany, setPage, sort, toggleSort, sortParams, query, applyQuery } = useListParams(KEYS);
  const { data, error, isLoading, refetch, isRefetching } = useAdminProductsQuery({ ...values, ...sortParams, page });
  const confirm = useConfirm();
  const categories = useAdminCategoriesQuery();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => productService.getBrands() });
  const { remove, bulk, duplicate } = useProductMutations();
  const bulkDelete = useBulkAction((id: number) => adminService.deleteProduct(id));
  const toast = useToast();
  const selection = useSelection((data?.data ?? []).map((p) => p.id), `${query}|${page}`);
  const [report, setReport] = useState<{ label: string; result: BulkProductResult } | null>(null);
  const [catId, setCatId] = useState("");

  const filters: FilterDef[] = [
    { key: "status", label: "Trạng thái", type: "select", options: Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => ({ value, label })) },
    { key: "category_id", label: "Danh mục", type: "select", options: (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
    { key: "brand_id", label: "Thương hiệu", type: "select", options: (brands.data ?? []).map((b) => ({ value: String(b.id), label: b.name })) },
    { key: "low_stock", label: "Sắp hết hàng", type: "toggle" },
  ];

  const onDelete = async (id: number, name: string) => {
    if (!(await confirm({ title: "Xóa sản phẩm?", message: `Sản phẩm "${name}" sẽ bị xóa. Đơn hàng cũ vẫn giữ nguyên thông tin.`, confirmLabel: "Xóa", danger: true }))) return;
    remove.mutate(id, { onSuccess: () => toast.showSuccess("Đã xóa sản phẩm."), onError: toast.showError });
  };

  const onDuplicate = (p: AdminProductRow) =>
    duplicate.mutate(p.id, {
      onSuccess: (copy) => { toast.showSuccess(`Đã nhân bản "${p.name}" thành bản nháp. Kiểm tra SKU, tồn kho và ảnh trước khi đăng bán.`); modal.openEdit(copy.id); },
      onError: toast.showError,
    });

  const onBulkDelete = async () => {
    const ids = selection.ids as number[];
    if (!(await confirm({ title: `Xóa ${ids.length} sản phẩm?`, message: "Các sản phẩm đã chọn sẽ bị xóa. Đơn hàng cũ vẫn giữ nguyên thông tin.", confirmLabel: "Xóa", danger: true }))) return;
    bulkDelete.mutate(ids, {
      onSuccess: (r) => { (r.failed ? toast.showError : toast.showSuccess)(bulkMessage(r, "Đã xóa", "sản phẩm")); selection.clear(); },
    });
  };

  const runBulk = (label: string, body: BulkBody) =>
    bulk.mutate({ ...body, ids: selection.ids as number[] } as BulkProductInput, {
      onSuccess: (result) => {
        selection.clear();
        if (result.failed) setReport({ label, result });
        else toast.showSuccess(`${label}: ${result.succeeded} sản phẩm.`);
      },
      onError: toast.showError,
    });

  const busy = bulk.isPending || bulkDelete.isPending;
  return (
    <>
      <PageHeader title="Sản phẩm" actions={<button type="button" onClick={modal.openCreate} className={btnPrimary}>+ Thêm sản phẩm</button>} />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="products" sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(p) => p.id} empty="Không có sản phẩm phù hợp."
        selection={selection} rowLabel={(p) => p.name}
        actions={<SavedViews tableId="products" presets={PRESETS} query={query} onApply={applyQuery} />}
        toolbar={<>
          <SearchBox label="Tìm sản phẩm" placeholder="Tên hoặc SKU..." value={values.q} onChange={(v) => set("q", v)} />
          <FilterChips filters={filters} values={values} onChange={(k, v) => set(k as (typeof KEYS)[number], v)} onClear={() => setMany({ status: "", category_id: "", brand_id: "", low_stock: "" })} />
        </>}
        bulkActions={<>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => runBulk("Hiện (đang bán)", { action: "status", status: "published" })}>Hiện</button>
          <button type="button" className={btnSecondary} disabled={busy} onClick={() => runBulk("Ẩn (lưu trữ)", { action: "status", status: "archived" })}>Ẩn</button>
          <Popover label="Gán danh mục" button="Gán danh mục" buttonClass={btnSecondary} panelClass="w-72">
            {(close) => (
              <div className="space-y-2">
                <label className="block text-sm">Thêm vào danh mục (giữ danh mục cũ)
                  <select className={inputClass} value={catId} onChange={(e) => setCatId(e.target.value)}>
                    <option value="">— Chọn danh mục —</option>
                    {categories.data?.map((c) => <option key={c.id} value={c.id}>{c.parent_id ? "— " : ""}{c.name}</option>)}
                  </select>
                </label>
                <div className="flex justify-end">
                  <button type="button" className={btnPrimary} disabled={!catId || busy}
                    onClick={() => { runBulk("Gán danh mục", { action: "add_category", category_id: Number(catId) }); close(); }}>Gán</button>
                </div>
              </div>
            )}
          </Popover>
          <button type="button" className={btnDanger} disabled={busy} onClick={() => void onBulkDelete()}>{bulkDelete.isPending ? "Đang xóa..." : "Xóa"}</button>
        </>}
        columns={[
          { header: "Ảnh", id: "image", cell: (p) => (
            <img src={safeImageUrl(p.thumbnail_url) ?? "/product-fallback.svg"} alt="" loading="lazy" decoding="async" width={40} height={40} className="h-10 w-10 rounded object-cover" />
          ) },
          { header: "Sản phẩm", sortKey: "name", hideable: false, cell: (p) => (
            <div className="min-w-40">
              <Link to={`/admin/san-pham/${p.id}`} className="text-left font-medium text-admin-primary hover:underline">{p.name}</Link>
              <p className="font-mono text-xs text-admin-muted">{p.sku ?? "—"}{p.variants_count > 1 && <span className="font-sans"> · {p.variants_count} biến thể</span>}</p>
            </div>
          ) },
          { header: "Danh mục", cell: (p) => <span className="text-sm">{p.categories.map((c) => c.name).join(", ") || <span className="text-admin-muted">Chưa phân loại</span>}</span> },
          { header: "Thương hiệu", secondary: true, cell: (p) => p.brand?.name ?? <span className="text-admin-muted">—</span> },
          { header: "Giá", sortKey: "price_min", align: "right", cell: (p) => <span className="whitespace-nowrap">{priceRange(p)}</span> },
          { header: "Tồn kho", sortKey: "stock_total", align: "right", cell: (p) => (
            <span className={p.stock_total <= LOW_STOCK ? "font-semibold text-admin-danger" : ""}>{p.stock_total}{p.stock_total <= LOW_STOCK && <span className="sr-only"> (sắp hết)</span>}</span>
          ) },
          { header: "Trạng thái", sortKey: "status", cell: (p) => <ProductStatusBadge status={p.status} /> },
          { header: "Cập nhật", sortKey: "updated_at", secondary: true, cell: (p) => <span className="whitespace-nowrap text-sm">{p.updated_at ? formatDateTime(p.updated_at) : "—"}</span> },
          { header: "Thao tác", hideable: false, cell: (p) => (
            <IconActions>
              <IconButton label="Xem chi tiết" ariaLabel={`Xem chi tiết ${p.name}`} icon={<Eye />} href={`/admin/san-pham/${p.id}`} />
              <IconButton label="Sửa" ariaLabel={`Sửa ${p.name}`} icon={<Pencil />} onClick={() => modal.openEdit(p.id)} />
              <IconButton label="Nhân bản" ariaLabel={`Nhân bản ${p.name}`} icon={<Copy />} disabled={duplicate.isPending} onClick={() => onDuplicate(p)} />
              <IconButton label="Xóa" ariaLabel={`Xóa ${p.name}`} tone="danger" icon={<Trash2 />} disabled={remove.isPending} onClick={() => void onDelete(p.id, p.name)} />
            </IconActions>
          ) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {modal.mode && <ProductFormModal key={modal.editId ?? "new"} id={modal.editId} onClose={modal.close} />}
      <Modal open={report !== null} onClose={() => setReport(null)} title="Kết quả thao tác hàng loạt"
        footer={<button type="button" className={btnSecondary} onClick={() => setReport(null)}>Đóng</button>}>
        {report && <>
          <p className="mb-3">{report.label}: <strong className="text-admin-success">{report.result.succeeded} thành công</strong>, <strong className="text-admin-danger">{report.result.failed} không thực hiện được</strong>.</p>
          <ul className="space-y-1">
            {report.result.results.filter((r) => !r.ok).map((r) => (
              <li key={r.id} className="rounded bg-admin-danger-subtle px-3 py-2"><span className="font-medium">{r.name ?? `#${r.id}`}</span>: {r.message}</li>
            ))}
          </ul>
        </>}
      </Modal>
    </>
  );
}

