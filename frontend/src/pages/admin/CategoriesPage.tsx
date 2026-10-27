import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { IconActions, IconButton } from "../../components/admin/ui/IconButton.tsx";
import { btnPrimary, flattenTree, inputClass } from "../../utils/adminFormat.ts";
import { CheckboxField, FormField, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
import { FormModal } from "../../components/admin/form/FormModal.tsx";
import { useModalParam } from "../../hooks/useModalParam.ts";
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
  const { remove } = useCategoryMutations();
  const toast = useToast();
  const modal = useModalParam();
  const tree = flattenTree(data ?? []);
  const editing = modal.editId !== null ? data?.find((c) => c.id === modal.editId) : undefined;

  const onDelete = async (c: AdminCategory) => {
    if (await confirm({ title: "Xóa danh mục?", message: `Danh mục "${c.name}" sẽ bị xóa. Thao tác này không hoàn tác được.`, confirmLabel: "Xóa", danger: true })) {
      remove.mutate(c.id, { onSuccess: () => toast.showSuccess("Đã xóa danh mục."), onError: toast.showError });
    }
  };

  return (
    <>
      <PageHeader title="Danh mục" actions={<button type="button" className={btnPrimary} onClick={modal.openCreate}>+ Thêm danh mục</button>} />
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <section className="rounded-xl border border-admin-border bg-admin-surface">
        {isLoading && <SkeletonBlock lines={4} className="border-0" />}
        {data && data.length === 0 && <EmptyState title="Chưa có danh mục." description="Bấm “Thêm danh mục” để tạo danh mục đầu tiên." />}
        <ul className="divide-y divide-admin-border">
          {tree.map(({ cat, depth }) => (
            <li key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm" style={{ paddingLeft: 16 + depth * 24 }}>
              <div>
                <span className="font-medium">{depth > 0 && "└ "}{cat.name}</span>
                {!cat.is_active && <span className="ml-2 rounded bg-admin-status-neutral-bg px-1.5 text-xs">Ẩn</span>}
                <p className="text-xs text-admin-muted">/{cat.slug} · {cat.products_count} sản phẩm · {cat.children_count} danh mục con</p>
              </div>
              <IconActions>
                <IconButton label="Sửa" ariaLabel={`Sửa danh mục ${cat.name}`} icon={<Pencil />} onClick={() => modal.openEdit(cat.id)} />
                <IconButton label="Xóa" ariaLabel={`Xóa danh mục ${cat.name}`} tone="danger" icon={<Trash2 />} disabled={remove.isPending} onClick={() => void onDelete(cat)} />
              </IconActions>
            </li>
          ))}
        </ul>
      </section>
      {modal.mode === "create" && <CategoryFormModal key="new" tree={tree} onClose={modal.close} />}
      {modal.mode === "edit" && editing && <CategoryFormModal key={editing.id} editing={editing} tree={tree} onClose={modal.close} />}
    </>
  );
}

function CategoryFormModal({ editing, tree, onClose }: { editing?: AdminCategory; tree: ReturnType<typeof flattenTree>; onClose: () => void }) {
  const { create, update } = useCategoryMutations();
  const toast = useToast();
  const [form, setForm] = useState<AdminCategoryInput>(() => editing
    ? { name: editing.name, slug: editing.slug, parent_id: editing.parent_id, description: editing.description ?? "", image_url: editing.image_url, is_active: editing.is_active, sort_order: editing.sort_order }
    : empty);
  const active = editing ? update : create;
  const errors = firstFieldErrors(active.error);
  const unsaved = useUnsavedChanges(form);

  const onSubmit = () => {
    const input = { ...form, slug: form.slug || null };
    const done = { onSuccess: () => { unsaved.markClean(); toast.showSuccess(editing ? "Đã lưu danh mục." : "Đã thêm danh mục."); onClose(); }, onError: toast.showError };
    if (editing) update.mutate({ id: editing.id, input }, done);
    else create.mutate(input, done);
  };

  return (
    <FormModal title={editing ? `Sửa danh mục: ${editing.name}` : "Thêm danh mục"} isDirty={unsaved.isDirty} onClose={onClose} onSubmit={onSubmit}
      saving={active.isPending} submitLabel={editing ? "Lưu" : "Thêm"}>
      {unsaved.prompt}
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
    </FormModal>
  );
}
