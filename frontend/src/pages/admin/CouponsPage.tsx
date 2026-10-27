import { useRef, useState, type FormEvent } from "react";
import { btnDanger, btnPrimary, btnSecondary, formatDateTime, inputClass, toLocalInput } from "../../utils/adminFormat.ts";
import { CheckboxField, FormField, useSaveShortcut, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
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
  const { create, update, remove } = useCouponMutations();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<AdminCouponInput>(empty);
  const active = editing ? update : create;
  const errors = firstFieldErrors(active.error);
  const selection = useSelection((data?.data ?? []).map((c) => c.id), `${query}|${page}`);
  const bulkDelete = useBulkAction((id: number) => adminService.deleteCoupon(id));
  const onBulkDelete = async () => {
    const ids = selection.ids as number[];
    if (!(await confirm({ title: `Xóa ${ids.length} mã giảm giá?`, message: "Các mã đã chọn sẽ bị xóa vĩnh viễn.", confirmLabel: "Xóa", danger: true }))) return;
    bulkDelete.mutate(ids, { onSuccess: (r) => { (r.failed ? toast.showError : toast.showSuccess)(bulkMessage(r, "Đã xóa", "mã giảm giá")); selection.clear(); if (editing && ids.includes(editing.id)) startEdit(null); } });
  };
  const formRef = useRef<HTMLFormElement>(null);
  const unsaved = useUnsavedChanges(form);
  useSaveShortcut(formRef);

  const startEdit = (c: AdminCoupon | null) => {
    create.reset();
    update.reset();
    setEditing(c);
    if (c) {
      const { id: _id, used_count: _u, ...rest } = c;
      const next = { ...rest, starts_at: toLocalInput(c.starts_at), expires_at: toLocalInput(c.expires_at) };
      setForm(next);
      unsaved.markClean(next);
    } else {
      setForm(empty);
      unsaved.markClean(empty);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = { ...form, starts_at: form.starts_at || null, expires_at: form.expires_at || null };
    const done = { onSuccess: () => { toast.showSuccess(editing ? "Đã lưu mã giảm giá." : "Đã tạo mã giảm giá."); startEdit(null); }, onError: toast.showError };
    if (editing) {
      update.mutate({ id: editing.id, input }, done);
    } else {
      create.mutate(input, done);
    }
  };

  const onDelete = async (c: AdminCoupon) => {
    if (await confirm({ title: "Xóa mã giảm giá?", message: `Mã ${c.code} sẽ bị xóa vĩnh viễn.`, confirmLabel: "Xóa", danger: true })) {
      remove.mutate(c.id, { onSuccess: () => toast.showSuccess("Đã xóa mã giảm giá."), onError: toast.showError });
    }
  };


  return (
    <>
      {unsaved.prompt}
      <PageHeader title="Mã giảm giá" />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
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
                <button type="button" className="text-admin-primary" onClick={() => startEdit(c)}>Sửa</button>
                <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => void onDelete(c)}>Xóa</button>
              </div>
            ) },
          ]} />
          <Pagination meta={data?.meta} onPage={setPage} />
        </div>

        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-5 text-sm">
          <h2 className="font-semibold">{editing ? `Sửa mã ${editing.code}` : "Tạo mã giảm giá"}</h2>
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
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={active.isPending}>{editing ? "Lưu" : "Tạo mã"}</button>
            {editing && <button type="button" className={btnSecondary} onClick={() => startEdit(null)}>Hủy</button>}
          </div>
        </form>
      </div>
    </>
  );
}
