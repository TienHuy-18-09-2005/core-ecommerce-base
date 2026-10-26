import { useState, type FormEvent } from "react";
import { btnDanger, btnPrimary, btnSecondary, formatDateTime, inputClass, toLocalInput } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { useAdminCouponsQuery, useCouponMutations } from "../../hooks/useAdminQuery.ts";
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
  const { values, page, set, setPage } = useListParams(["q"] as const);
  const { data, error, isLoading } = useAdminCouponsQuery({ ...values, page });
  const { create, update, remove } = useCouponMutations();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<AdminCouponInput>(empty);
  const active = editing ? update : create;
  const errors = firstFieldErrors(active.error);

  const startEdit = (c: AdminCoupon | null) => {
    create.reset();
    update.reset();
    setEditing(c);
    if (c) {
      const { id: _id, used_count: _u, ...rest } = c;
      setForm({ ...rest, starts_at: toLocalInput(c.starts_at), expires_at: toLocalInput(c.expires_at) });
    } else {
      setForm(empty);
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

  const onDelete = (c: AdminCoupon) => {
    if (window.confirm(`Xoá mã ${c.code}?`)) {
      remove.mutate(c.id, { onSuccess: () => toast.showSuccess("Đã xoá mã giảm giá."), onError: toast.showError });
    }
  };

  const err = (k: string) => errors[k] && <span role="alert" className="text-xs text-red-600">{errors[k]}</span>;

  return (
    <>
      <PageHeader title="Mã giảm giá" />
      <QueryError error={error} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <input aria-label="Tìm mã" placeholder="Tìm mã..." className={`${inputClass} mb-3`} defaultValue={values.q}
            onKeyDown={(e) => { if (e.key === "Enter") set("q", e.currentTarget.value.trim()); }} />
          <DataTable rows={data?.data} isLoading={isLoading} rowKey={(c) => c.id} empty="Chưa có mã giảm giá." columns={[
            { header: "Mã", cell: (c) => <span className="font-mono font-semibold">{c.code}</span> },
            { header: "Giảm", cell: (c) => (c.type === "percent" ? `${c.value}%${c.max_discount_amount ? ` (tối đa ${formatCurrency(c.max_discount_amount)})` : ""}` : formatCurrency(c.value)) },
            { header: "Đã dùng", cell: (c) => `${c.used_count}${c.usage_limit !== null ? `/${c.usage_limit}` : ""}` },
            { header: "Hiệu lực", cell: (c) => <span className="text-xs">{formatDateTime(c.starts_at)} → {formatDateTime(c.expires_at)}</span> },
            { header: "Trạng thái", cell: (c) => (c.is_active ? "Đang bật" : "Tắt") },
            { header: "Thao tác", cell: (c) => (
              <div className="flex gap-2">
                <button type="button" className="text-blue-700" onClick={() => startEdit(c)}>Sửa</button>
                <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => onDelete(c)}>Xoá</button>
              </div>
            ) },
          ]} />
          <Pagination meta={data?.meta} onPage={setPage} />
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <h2 className="font-semibold">{editing ? `Sửa mã ${editing.code}` : "Tạo mã giảm giá"}</h2>
          <label className="block"><span className="mb-1 block font-medium">Mã</span>
            <input className={`${inputClass} uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />{err("code")}</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block font-medium">Loại</span>
              <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AdminCouponInput["type"] })}>
                <option value="fixed">Số tiền</option><option value="percent">Phần trăm</option>
              </select></label>
            <label className="block"><span className="mb-1 block font-medium">Giá trị</span>
              <input type="number" min={0} className={inputClass} value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />{err("value")}</label>
            <label className="block"><span className="mb-1 block font-medium">Đơn tối thiểu</span>
              <input type="number" min={0} className={inputClass} value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />{err("min_order_amount")}</label>
            <label className="block"><span className="mb-1 block font-medium">Giảm tối đa</span>
              <input type="number" min={0} className={inputClass} value={form.max_discount_amount ?? ""} onChange={(e) => setForm({ ...form, max_discount_amount: numOrNull(e.target.value) })} />{err("max_discount_amount")}</label>
            <label className="block"><span className="mb-1 block font-medium">Tổng lượt dùng</span>
              <input type="number" min={1} className={inputClass} value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: numOrNull(e.target.value) })} />{err("usage_limit")}</label>
            <label className="block"><span className="mb-1 block font-medium">Lượt / khách</span>
              <input type="number" min={1} className={inputClass} value={form.per_customer_limit ?? ""} onChange={(e) => setForm({ ...form, per_customer_limit: numOrNull(e.target.value) })} />{err("per_customer_limit")}</label>
          </div>
          <label className="block"><span className="mb-1 block font-medium">Bắt đầu</span>
            <input type="datetime-local" className={inputClass} value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />{err("starts_at")}</label>
          <label className="block"><span className="mb-1 block font-medium">Hết hạn</span>
            <input type="datetime-local" className={inputClass} value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />{err("expires_at")}</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Đang bật</label>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={active.isPending}>{editing ? "Lưu" : "Tạo mã"}</button>
            {editing && <button type="button" className={btnSecondary} onClick={() => startEdit(null)}>Huỷ</button>}
          </div>
        </form>
      </div>
    </>
  );
}
