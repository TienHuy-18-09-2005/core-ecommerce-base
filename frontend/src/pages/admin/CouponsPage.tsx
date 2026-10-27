import { useState } from "react";
import { btnDanger, btnPrimary, formatDateTime, inputClass, toLocalInput } from "../../utils/adminFormat.ts";
import { CheckboxField, FormField, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
import { FormModal } from "../../components/admin/form/FormModal.tsx";
import { useModalParam } from "../../hooks/useModalParam.ts";
import { useToast } from "../../app/useToast.ts";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { useAdminCouponsQuery, useBulkAction, useCouponMutations } from "../../hooks/useAdminQuery.ts";
import { SearchBox } from "../../components/admin/table/FilterBar.tsx";
import { useSelection } from "../../components/admin/table/useSelection.ts";
import { bulkMessage } from "../../components/admin/table/bulkMessage.ts";
import { adminService } from "../../services/adminService.ts";
import { useListParams } from "../../hooks/useListParams.ts";
import type { AdminCoupon, AdminCouponInput } from "../../types/admin.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

const empty: AdminCouponInput = {
  code: "", type: "fixed", value: 0, min_order_amount: 0, max_discount_amount: null,
  usage_limit: null, per_customer_limit: null, starts_at: null, expires_at: null, is_active: true,
};
const numOrNull = (v: string) => (v === "" ? null : Number(v));

export default function CouponsPage() {
  const { values, page, set, setPage, sort, toggleSort, sortParams, query } = useListParams(["q"] as const);
  const { data, error, isLoading, refetch, isRefetching } = useAdminCouponsQuery({ ...values, ...sortParams, page });
  const confirm = useConfirm();
  const { remove } = useCouponMutations();
  const toast = useToast();
  const modal = useModalParam();
  const editing = modal.editId !== null ? data?.data.find((c) => c.id === modal.editId) : undefined;
  const selection = useSelection((data?.data ?? []).map((c) => c.id), `${query}|${page}`);
  const bulkDelete = useBulkAction((id: number) => adminService.deleteCoupon(id));
  const onBulkDelete = async () => {
    const ids = selection.ids as number[];
    if (!(await confirm({ title: `Xóa ${ids.length} mã giảm giá?`, message: "Các mã đã chọn sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", danger: true }))) return;
    bulkDelete.mutate(ids, { onSuccess: (r) => { (r.failed ? toast.showError : toast.showSuccess)(bulkMessage(r, "Đã xóa", "mã giảm giá")); selection.clear(); } });
  };

  const onDelete = async (c: AdminCoupon) => {
    if (await confirm({ title: "Xóa mã giảm giá?", message: `Mã ${c.code} sẽ bị xóa vĩnh viễn.`, confirmLabel: "Xóa", danger: true })) {
      remove.mutate(c.id, { onSuccess: () => toast.showSuccess("Đã xóa mã giảm giá."), onError: toast.showError });
    }
  };

  return (
    <>
      <PageHeader title="Mã giảm giá" actions={<button type="button" className={btnPrimary} onClick={modal.openCreate}>+ Tạo mã giảm giá</button>} />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <div>
          <DataTable tableId="coupons" selection={selection} rowLabel={(c) => `mã ${c.code}`}
            toolbar={<SearchBox label="Tìm mã" placeholder="Tìm mã..." value={values.q} onChange={(v) => set("q", v)} />}
            bulkActions={<button type="button" className={btnDanger} disabled={bulkDelete.isPending} onClick={() => void onBulkDelete()}>Xóa đã chọn</button>}
            sort={sort} onSort={toggleSort} rows={data?.data} isLoading={isLoading} rowKey={(c) => c.id} empty="Chưa có mã giảm giá." columns={[
            { header: "Mã", sortKey: "code", hideable: false, cell: (c) => <span className="font-mono font-semibold">{c.code}</span> },
            { header: "Giảm", sortKey: "value", cell: (c) => (c.type === "percent" ? `${c.value}%${c.max_discount_amount ? ` (tối đa ${formatCurrency(c.max_discount_amount)})` : ""}` : formatCurrency(c.value)) },
            { header: "Đã dùng", sortKey: "used_count", align: "right", cell: (c) => `${c.used_count}${c.usage_limit !== null ? `/${c.usage_limit}` : ""}` },
            { header: "Hiệu lực", secondary: true, sortKey: "expires_at", cell: (c) => <span className="text-xs">{formatDateTime(c.starts_at)} → {formatDateTime(c.expires_at)}</span> },
            { header: "Trạng thái", sortKey: "is_active", cell: (c) => (c.is_active ? "Đang bật" : "Tắt") },
            { header: "Thao tác", hideable: false, cell: (c) => (
              <div className="flex gap-2">
                <button type="button" className="text-admin-primary" aria-label={`Sửa mã ${c.code}`} onClick={() => modal.openEdit(c.id)}>Sửa</button>
                <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => void onDelete(c)}>Xóa</button>
              </div>
            ) },
          ]} />
          <Pagination meta={data?.meta} onPage={setPage} />
      </div>
      {modal.mode === "create" && <CouponFormModal key="new" onClose={modal.close} />}
      {modal.mode === "edit" && editing && <CouponFormModal key={editing.id} editing={editing} onClose={modal.close} />}
    </>
  );
}

function CouponFormModal({ editing, onClose }: { editing?: AdminCoupon; onClose: () => void }) {
  const { create, update } = useCouponMutations();
  const toast = useToast();
  const [form, setForm] = useState<AdminCouponInput>(() => {
    if (!editing) return empty;
    const { id: _id, used_count: _u, ...rest } = editing;
    return { ...rest, starts_at: toLocalInput(editing.starts_at), expires_at: toLocalInput(editing.expires_at) };
  });
  const active = editing ? update : create;
  const errors = firstFieldErrors(active.error);
  const unsaved = useUnsavedChanges(form);

  const onSubmit = () => {
    const input = { ...form, starts_at: form.starts_at || null, expires_at: form.expires_at || null };
    const done = { onSuccess: () => { unsaved.markClean(); toast.showSuccess(editing ? "Đã lưu mã giảm giá." : "Đã tạo mã giảm giá."); onClose(); }, onError: toast.showError };
    if (editing) update.mutate({ id: editing.id, input }, done);
    else create.mutate(input, done);
  };

  return (
    <FormModal title={editing ? `Sửa mã ${editing.code}` : "Tạo mã giảm giá"} isDirty={unsaved.isDirty} onClose={onClose} onSubmit={onSubmit}
      saving={active.isPending} submitLabel={editing ? "Lưu" : "Tạo mã"}>
      {unsaved.prompt}
      <FormField label="Mã" error={errors.code} required>
        <input className={`${inputClass} uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Loại" required>
        <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdminCouponInput["type"] })}>
            <option value="fixed">Số tiền</option><option value="percent">Phần trăm</option>
          </select>
      </FormField>
        <FormField label="Giá trị" error={errors.value} required>
        <input type="number" min={0} className={inputClass} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
      </FormField>
        <FormField label="Đơn tối thiểu" error={errors.min_order_amount}>
        <input type="number" min={0} className={inputClass} value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
      </FormField>
        <FormField label="Giảm tối đa" hint="Chỉ áp dụng cho loại phần trăm. Để trống nếu không giới hạn." error={errors.max_discount_amount}>
        <input type="number" min={0} className={inputClass} value={form.max_discount_amount ?? ""} onChange={(e) => setForm({ ...form, max_discount_amount: numOrNull(e.target.value) })} />
      </FormField>
        <FormField label="Tổng lượt dùng" hint="Để trống nếu không giới hạn." error={errors.usage_limit}>
        <input type="number" min={1} className={inputClass} value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: numOrNull(e.target.value) })} />
      </FormField>
        <FormField label="Lượt / khách" hint="Để trống nếu không giới hạn." error={errors.per_customer_limit}>
        <input type="number" min={1} className={inputClass} value={form.per_customer_limit ?? ""} onChange={(e) => setForm({ ...form, per_customer_limit: numOrNull(e.target.value) })} />
      </FormField>
      </div>
      <FormField label="Bắt đầu" error={errors.starts_at}>
        <input type="datetime-local" className={inputClass} value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
      </FormField>
      <FormField label="Hết hạn" error={errors.expires_at}>
        <input type="datetime-local" className={inputClass} value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
      </FormField>
      <CheckboxField label="Đang bật"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /></CheckboxField>
    </FormModal>
  );
}
