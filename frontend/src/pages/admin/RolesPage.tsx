import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserCog, UserMinus } from "lucide-react";
import { Badge } from "../../components/admin/Badge.tsx";
import { CheckboxField, FormField, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
import { FormModal } from "../../components/admin/form/FormModal.tsx";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { SearchBox } from "../../components/admin/table/FilterBar.tsx";
import { DataTable, PageHeader, Pagination, QueryError } from "../../components/admin/ui.tsx";
import { IconActions, IconButton } from "../../components/admin/ui/IconButton.tsx";
import { useToast } from "../../app/useToast.ts";
import { useAuth } from "../../app/useAuth.ts";
import { useAdminRolesQuery, useAdminStaffQuery, usePermissionCatalogQuery, useRoleMutations } from "../../hooks/useAdminQuery.ts";
import type { AdminRole, AdminRoleInput, AdminStaff, PermissionGroup } from "../../types/admin.ts";
import { btnPrimary, formatDateTime, inputClass } from "../../utils/adminFormat.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";

type Tab = "roles" | "staff";

/** R6: quản lý vai trò (nhóm quyền) và gán vai trò cho nhân viên. Chỉ admin (roles.manage). */
export default function RolesPage() {
  const [tab, setTab] = useState<Tab>("roles");
  const tabCls = (t: Tab) => `-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-admin-primary text-admin-primary" : "border-transparent text-admin-muted hover:text-admin-fg"}`;
  return (
    <>
      <PageHeader title="Vai trò & phân quyền" />
      <div role="tablist" aria-label="Vai trò và nhân viên" className="mb-4 flex gap-1 border-b border-admin-border">
        <button type="button" role="tab" aria-selected={tab === "roles"} className={tabCls("roles")} onClick={() => setTab("roles")}>Vai trò</button>
        <button type="button" role="tab" aria-selected={tab === "staff"} className={tabCls("staff")} onClick={() => setTab("staff")}>Nhân viên</button>
      </div>
      <div role="tabpanel">{tab === "roles" ? <RolesTab /> : <StaffTab />}</div>
    </>
  );
}

function permissionLabels(groups: PermissionGroup[] | undefined) {
  const map = new Map<string, string>();
  groups?.forEach((g) => g.items.forEach((i) => map.set(i.key, i.label)));
  return map;
}

function RolesTab() {
  const [q, setQ] = useState("");
  const [permission, setPermission] = useState("");
  const catalog = usePermissionCatalogQuery();
  const { data, error, isLoading, refetch, isRefetching } = useAdminRolesQuery({ q, permission });
  const { remove } = useRoleMutations();
  const confirm = useConfirm();
  const toast = useToast();
  const [editing, setEditing] = useState<AdminRole | "new" | null>(null);
  const labels = useMemo(() => permissionLabels(catalog.data), [catalog.data]);
  const total = catalog.data?.reduce((n, g) => n + g.items.filter((i) => !i.admin_only).length, 0) ?? 0;

  const onDelete = async (r: AdminRole) => {
    if (!(await confirm({ title: "Xóa vai trò?", message: `Vai trò "${r.name}" sẽ bị xóa vĩnh viễn.`, confirmLabel: "Xóa", danger: true }))) return;
    remove.mutate(r.id, { onSuccess: () => toast.showSuccess("Đã xóa vai trò."), onError: toast.showError });
  };

  return (
    <>
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="roles" rows={data} isLoading={isLoading} rowKey={(r) => r.id} empty="Không có vai trò phù hợp."
        actions={<button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => setEditing("new")}><Plus aria-hidden className="size-4" />Thêm vai trò</button>}
        toolbar={<>
          <SearchBox label="Tìm vai trò" placeholder="Tên vai trò..." value={q} onChange={setQ} />
          <label className="text-sm">
            <span className="sr-only">Lọc theo quyền</span>
            <select className={`${inputClass} w-56`} value={permission} onChange={(e) => setPermission(e.target.value)} aria-label="Lọc theo quyền">
              <option value="">Mọi quyền</option>
              {catalog.data?.map((g) => (
                <optgroup key={g.id} label={g.label}>
                  {g.items.filter((i) => !i.admin_only).map((i) => <option key={i.key} value={i.key}>{i.label}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </>}
        columns={[
          { header: "Vai trò", hideable: false, cell: (r) => (
            <div>
              <span className="font-medium">{r.name}</span>{r.is_system && <span className="ml-2"><Badge>Mặc định</Badge></span>}
              {r.description && <p className="text-xs text-admin-muted">{r.description}</p>}
            </div>
          ) },
          { header: "Quyền", cell: (r) => (
            <span title={r.permissions.map((p) => labels.get(p) ?? p).join(", ")} className="text-sm">{r.permissions.length}{total ? `/${total}` : ""} quyền</span>
          ) },
          { header: "Nhân viên", align: "right", cell: (r) => r.users_count },
          { header: "Cập nhật", secondary: true, cell: (r) => <span className="whitespace-nowrap text-sm">{r.updated_at ? formatDateTime(r.updated_at) : "—"}</span> },
          { header: "Thao tác", hideable: false, cell: (r) => (
            <IconActions>
              <IconButton label="Sửa" ariaLabel={`Sửa vai trò ${r.name}`} icon={<Pencil />} onClick={() => setEditing(r)} />
              <IconButton label={r.users_count > 0 ? "Đang có nhân viên, không thể xóa" : "Xóa"} ariaLabel={`Xóa vai trò ${r.name}`} tone="danger" icon={<Trash2 />}
                disabled={remove.isPending || r.users_count > 0} onClick={() => void onDelete(r)} />
            </IconActions>
          ) },
        ]} />
      {editing && <RoleFormModal key={editing === "new" ? "new" : editing.id} role={editing === "new" ? undefined : editing} groups={catalog.data ?? []} onClose={() => setEditing(null)} />}
    </>
  );
}

export function RoleFormModal({ role, groups, onClose }: { role?: AdminRole; groups: PermissionGroup[]; onClose: () => void }) {
  const { create, update } = useRoleMutations();
  const toast = useToast();
  const [form, setForm] = useState<AdminRoleInput>(() => ({ name: role?.name ?? "", description: role?.description ?? "", permissions: role?.permissions ?? [] }));
  const active = role ? update : create;
  const errors = firstFieldErrors(active.error);
  const unsaved = useUnsavedChanges(form);
  const has = (k: string) => form.permissions.includes(k);
  const toggle = (keys: string[], on: boolean) => setForm((f) => ({
    ...f, permissions: on ? [...new Set([...f.permissions, ...keys])] : f.permissions.filter((p) => !keys.includes(p)),
  }));

  const onSubmit = () => {
    const done = { onSuccess: () => { unsaved.markClean(); toast.showSuccess(role ? "Đã lưu vai trò." : "Đã tạo vai trò."); onClose(); }, onError: toast.showError };
    if (role) update.mutate({ id: role.id, input: form }, done);
    else create.mutate(form, done);
  };

  return (
    <FormModal title={role ? `Sửa vai trò: ${role.name}` : "Thêm vai trò"} size="lg" isDirty={unsaved.isDirty} onClose={onClose} onSubmit={onSubmit}
      saving={active.isPending} submitLabel={role ? "Lưu" : "Tạo vai trò"}>
      {unsaved.prompt}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tên vai trò" error={errors.name} required>
          <input className={inputClass} value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FormField>
        <FormField label="Mô tả" error={errors.description}>
          <input className={inputClass} value={form.description} maxLength={255} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FormField>
      </div>
      <fieldset className="space-y-3">
        <legend className="mb-1 text-sm font-semibold text-admin-fg">Quyền</legend>
        {errors.permissions && <p role="alert" className="text-xs text-admin-danger">{errors.permissions}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const keys = g.items.filter((i) => !i.admin_only).map((i) => i.key);
            const checked = keys.filter(has).length;
            return (
              <div key={g.id} role="group" aria-labelledby={`perm-g-${g.id}`} className="rounded-lg border border-admin-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span id={`perm-g-${g.id}`} className="text-sm font-semibold">{g.label}</span>
                  {keys.length > 0 && (
                    <label className="inline-flex items-center gap-1.5 text-xs text-admin-muted">
                      <input type="checkbox" className="size-4 accent-admin-primary" checked={checked === keys.length}
                        ref={(el) => { if (el) el.indeterminate = checked > 0 && checked < keys.length; }}
                        onChange={(e) => toggle(keys, e.target.checked)} aria-label={`Chọn tất cả quyền nhóm ${g.label}`} />
                      Tất cả
                    </label>
                  )}
                </div>
                <div className="space-y-1.5">
                  {g.items.map((i) => (
                    <CheckboxField key={i.key} label={i.label} hint={i.admin_only ? "Chỉ quản trị viên" : undefined}>
                      <input type="checkbox" checked={!i.admin_only && has(i.key)} disabled={i.admin_only} onChange={(e) => toggle([i.key], e.target.checked)} />
                    </CheckboxField>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </FormModal>
  );
}

function StaffTab() {
  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState("");
  const [page, setPage] = useState(1);
  const roles = useAdminRolesQuery();
  const { data, error, isLoading, refetch, isRefetching } = useAdminStaffQuery({ q, role_id: roleId, page });
  const { removeStaff } = useRoleMutations();
  const { user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [assigning, setAssigning] = useState<AdminStaff | "new" | null>(null);

  const onRevoke = async (s: AdminStaff) => {
    if (!(await confirm({ title: "Thu hồi quyền nhân viên?", message: `${s.name} sẽ trở về tài khoản khách hàng và mất mọi vai trò.`, confirmLabel: "Thu hồi", danger: true }))) return;
    removeStaff.mutate(s.id, { onSuccess: () => toast.showSuccess("Đã thu hồi quyền nhân viên."), onError: toast.showError });
  };

  return (
    <>
      <QueryError error={error} onRetry={refetch} retrying={isRefetching} />
      <DataTable tableId="staff" rows={data?.data} isLoading={isLoading} rowKey={(s) => s.id} empty="Chưa có nhân viên."
        actions={<button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => setAssigning("new")}><Plus aria-hidden className="size-4" />Thêm nhân viên</button>}
        toolbar={<>
          <SearchBox label="Tìm nhân viên" placeholder="Tên hoặc email..." value={q} onChange={(v) => { setQ(v); setPage(1); }} />
          <select className={`${inputClass} w-48`} aria-label="Lọc theo vai trò" value={roleId} onChange={(e) => { setRoleId(e.target.value); setPage(1); }}>
            <option value="">Mọi vai trò</option>
            {roles.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </>}
        columns={[
          { header: "Nhân viên", hideable: false, cell: (s) => <div><span className="font-medium">{s.name}</span><p className="text-xs text-admin-muted">{s.email}</p></div> },
          { header: "Vai trò", cell: (s) => (s.role === "admin"
            ? <Badge tone="confirmed">Quản trị viên · toàn quyền</Badge>
            : s.roles.length ? <div className="flex flex-wrap gap-1">{s.roles.map((r) => <Badge key={r.id}>{r.name}</Badge>)}</div>
              : <span className="text-sm text-admin-danger">Chưa có vai trò (không vào được quản trị)</span>) },
          { header: "Trạng thái", secondary: true, cell: (s) => (s.is_active ? "Đang hoạt động" : "Đã khóa") },
          { header: "Thao tác", hideable: false, cell: (s) => (s.role === "admin" || s.id === user?.id ? <span className="text-xs text-admin-muted">—</span> : (
            <IconActions>
              <IconButton label="Gán vai trò" ariaLabel={`Gán vai trò cho ${s.name}`} icon={<UserCog />} onClick={() => setAssigning(s)} />
              <IconButton label="Thu hồi quyền nhân viên" ariaLabel={`Thu hồi quyền nhân viên của ${s.name}`} tone="danger" icon={<UserMinus />} disabled={removeStaff.isPending} onClick={() => void onRevoke(s)} />
            </IconActions>
          )) },
        ]} />
      <Pagination meta={data?.meta} onPage={setPage} />
      {assigning && <StaffRolesModal key={assigning === "new" ? "new" : assigning.id} staff={assigning === "new" ? undefined : assigning} roles={roles.data ?? []} onClose={() => setAssigning(null)} />}
    </>
  );
}

export function StaffRolesModal({ staff, roles, onClose }: { staff?: AdminStaff; roles: AdminRole[]; onClose: () => void }) {
  const { addStaff, updateStaff } = useRoleMutations();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", roleIds: staff?.roles.map((r) => r.id) ?? [] });
  const active = staff ? updateStaff : addStaff;
  const errors = firstFieldErrors(active.error);
  const unsaved = useUnsavedChanges(form);
  const toggle = (id: number, on: boolean) => setForm((f) => ({ ...f, roleIds: on ? [...f.roleIds, id] : f.roleIds.filter((x) => x !== id) }));

  const onSubmit = () => {
    const done = { onSuccess: () => { unsaved.markClean(); toast.showSuccess(staff ? "Đã cập nhật vai trò." : "Đã thêm nhân viên."); onClose(); }, onError: toast.showError };
    if (staff) updateStaff.mutate({ id: staff.id, roleIds: form.roleIds }, done);
    else addStaff.mutate({ email: form.email.trim(), roleIds: form.roleIds }, done);
  };

  return (
    <FormModal title={staff ? `Gán vai trò: ${staff.name}` : "Thêm nhân viên"} isDirty={unsaved.isDirty} onClose={onClose} onSubmit={onSubmit}
      saving={active.isPending} submitLabel={staff ? "Lưu" : "Thêm nhân viên"}>
      {unsaved.prompt}
      {!staff && (
        <FormField label="Email tài khoản" hint="Tài khoản phải đã đăng ký trên cửa hàng." error={errors.email} required>
          <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-admin-fg">Vai trò</legend>
        <p className="mb-2 text-xs text-admin-muted">Có thể chọn nhiều vai trò; quyền là hợp của các vai trò đã chọn.</p>
        {(errors.role_ids ?? Object.entries(errors).find(([k]) => k.startsWith("role_ids"))?.[1]) && (
          <p role="alert" className="mb-2 text-xs text-admin-danger">{errors.role_ids ?? Object.entries(errors).find(([k]) => k.startsWith("role_ids"))?.[1]}</p>
        )}
        <div className="space-y-2">
          {roles.map((r) => (
            <CheckboxField key={r.id} label={r.name} hint={r.description ?? undefined}>
              <input type="checkbox" checked={form.roleIds.includes(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
            </CheckboxField>
          ))}
        </div>
      </fieldset>
    </FormModal>
  );
}
