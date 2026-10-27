import { useRef, useState, type FormEvent } from "react";
import { btnDanger, btnPrimary, btnSecondary, flattenTree, inputClass } from "../../utils/adminFormat.ts";
import { CheckboxField, FormField, useSaveShortcut, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
import { useToast } from "../../app/useToast.ts";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { SkeletonBlock, EmptyState } from "../../components/admin/feedback.tsx";
import { PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useAdminCategoriesQuery, useCategoryMutations } from "../../hooks/useAdminQuery.ts";
import type { AdminCategory, AdminCategoryInput } from "../../types/admin.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";

const empty: AdminCategoryInput = { name: "", slug: "", parent_id: null, description: "", image_url: null, is_active: true, sort_order: 0 };

export default function CategoriesPage() {
  const { data, error, isLoading, refetch, isRefetching } = useAdminCategoriesQuery();
  const confirm = useConfirm();
  const { create, update, remove } = useCategoryMutations();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<AdminCategoryInput>(empty);
  const active = editing ? update : create;
  const errors = firstFieldErrors(active.error);
  const formRef = useRef<HTMLFormElement>(null);
  const unsaved = useUnsavedChanges(form);
  useSaveShortcut(formRef);
  const tree = flattenTree(data ?? []);

  const startEdit = (c: AdminCategory | null) => {
    create.reset();
    update.reset();
    setEditing(c);
    const next = c ? { name: c.name, slug: c.slug, parent_id: c.parent_id, description: c.description ?? "", image_url: c.image_url, is_active: c.is_active, sort_order: c.sort_order } : empty;
    setForm(next);
    unsaved.markClean(next);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input = { ...form, slug: form.slug || null };
    const done = { onSuccess: () => { toast.showSuccess(editing ? "Đã lưu danh mục." : "Đã thêm danh mục."); startEdit(null); }, onError: toast.showError };
    if (editing) {
      update.mutate({ id: editing.id, input }, done);
    } else {
      create.mutate(input, done);
    }
  };

  const onDelete = async (c: AdminCategory) => {
    if (await confirm({ title: "Xóa danh mục?", message: `Danh mục "${c.name}" sẽ bị xóa. Thao tác này không hoàn tác được.`, confirmLabel: "Xóa", danger: true })) {
      remove.mutate(c.id, { onSuccess: () => toast.showSuccess("Đã xóa danh mục."), onError: toast.showError });
    }
  };

  return (
    <>
      {unsaved.prompt}
      <PageHeader title="Danh mục" />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-admin-border bg-admin-surface lg:col-span-2">
          {isLoading && <SkeletonBlock lines={4} className="border-0" />}
          {data && data.length === 0 && <EmptyState title="Chưa có danh mục." description="Thêm danh mục đầu tiên bằng biểu mẫu bên cạnh." />}
          <ul className="divide-y divide-admin-border">
            {tree.map(({ cat, depth }) => (
              <li key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm" style={{ paddingLeft: 16 + depth * 24 }}>
                <div>
                  <span className="font-medium">{depth > 0 && "└ "}{cat.name}</span>
                  {!cat.is_active && <span className="ml-2 rounded bg-admin-status-neutral-bg px-1.5 text-xs">Ẩn</span>}
                  <p className="text-xs text-admin-muted">/{cat.slug} · {cat.products_count} sản phẩm · {cat.children_count} danh mục con</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="text-admin-primary" onClick={() => startEdit(cat)}>Sửa</button>
                  <button type="button" className={btnDanger} disabled={remove.isPending} onClick={() => void onDelete(cat)}>Xóa</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-5 text-sm">
          <h2 className="font-semibold">{editing ? `Sửa: ${editing.name}` : "Thêm danh mục"}</h2>
          <FormField label="Tên danh mục" error={errors.name} required>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="Slug" hint="Để trống sẽ tự tạo từ tên." error={errors.slug}>
            <input className={inputClass} value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </FormField>
          <FormField label="Danh mục cha" error={errors.parent_id}>
            <select className={inputClass} value={form.parent_id ?? ""} onChange={(e) => setForm({ ...form, parent_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— Gốc —</option>
              {tree.filter(({ cat }) => cat.id !== editing?.id).map(({ cat, depth }) => <option key={cat.id} value={cat.id}>{"— ".repeat(depth)}{cat.name}</option>)}
            </select>
          </FormField>
          <FormField label="Mô tả">
            <textarea className={inputClass} rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label="Thứ tự">
            <input type="number" className={inputClass} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </FormField>
          <CheckboxField label="Hiển thị trên shop"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /></CheckboxField>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={active.isPending}>{editing ? "Lưu" : "Thêm"}</button>
            {editing && <button type="button" className={btnSecondary} onClick={() => startEdit(null)}>Hủy</button>}
          </div>
        </form>
      </div>
    </>
  );
}
