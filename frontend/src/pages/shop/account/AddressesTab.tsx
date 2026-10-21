import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useToast } from "../../../app/useToast.ts";
import { FormField } from "../../../components/common/FormField.tsx";
import { accountService } from "../../../services/accountService.ts";
import type { Address, AddressInput } from "../../../types/auth.ts";
import { firstFieldErrors } from "../../../utils/fieldErrors.ts";
import { isValidVnPhone, normalizeVnPhone } from "../../../utils/vnPhone.ts";

const addressesQueryKey = ["account", "addresses"] as const;

const EMPTY: AddressInput = { recipient_name: "", recipient_phone: "", province: "", district: "", ward: "", street_address: "", is_default: false };
const FIELDS: { name: keyof AddressInput; label: string }[] = [
  { name: "recipient_name", label: "Người nhận" },
  { name: "recipient_phone", label: "Số điện thoại" },
  { name: "province", label: "Tỉnh/Thành phố" },
  { name: "district", label: "Quận/Huyện" },
  { name: "ward", label: "Phường/Xã" },
  { name: "street_address", label: "Địa chỉ cụ thể" },
];

export function AddressesTab() {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const list = useQuery({ queryKey: addressesQueryKey, queryFn: ({ signal }) => accountService.addresses(signal) });
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [local, setLocal] = useState<Record<string, string>>({});

  const done = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: addressesQueryKey });
    showSuccess(message);
    setEditing(null);
  };
  const save = useMutation({
    mutationFn: (input: AddressInput) => (editing && editing !== "new" ? accountService.updateAddress(editing.id, input) : accountService.createAddress(input)),
    onSuccess: () => done("Đã lưu địa chỉ."),
    onError: showError,
  });
  const remove = useMutation({ mutationFn: (id: number) => accountService.deleteAddress(id), onSuccess: () => done("Đã xoá địa chỉ."), onError: showError });

  const open = (target: Address | "new") => {
    setEditing(target);
    setLocal({});
    save.reset();
    setForm(target === "new" ? EMPTY : { ...target });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of FIELDS) if (!String(form[f.name]).trim()) errs[f.name] = `Vui lòng nhập ${f.label.toLowerCase()}.`;
    if (form.recipient_phone && !isValidVnPhone(form.recipient_phone)) errs.recipient_phone = "Số điện thoại không hợp lệ.";
    setLocal(errs);
    if (Object.keys(errs).length === 0) save.mutate({ ...form, recipient_phone: normalizeVnPhone(form.recipient_phone) });
  };
  const errors = { ...firstFieldErrors(save.error), ...local };

  if (list.isPending) return <p>Đang tải sổ địa chỉ...</p>;
  if (list.isError) return <p role="alert" className="text-red-700">Không tải được sổ địa chỉ.</p>;

  return (
    <div className="space-y-4">
      {list.data.length === 0 ? <p className="text-slate-600">Chưa có địa chỉ nào.</p> : null}
      <ul className="space-y-2">
        {list.data.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-semibold">{a.recipient_name} · {a.recipient_phone} {a.is_default ? <span className="ml-2 rounded bg-blue-100 px-2 text-xs text-blue-700">Mặc định</span> : null}</p>
              <p className="text-slate-600">{a.street_address}, {a.ward}, {a.district}, {a.province}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="text-blue-700 underline" onClick={() => open(a)}>Sửa</button>
              <button type="button" className="text-red-700 underline" disabled={remove.isPending} onClick={() => remove.mutate(a.id)} aria-label={`Xoá địa chỉ ${a.street_address}`}>Xoá</button>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border bg-slate-50 p-4 sm:grid-cols-2" noValidate aria-label="Biểu mẫu địa chỉ">
          {FIELDS.map((f) => (
            <FormField key={f.name} label={f.label} name={f.name} value={String(form[f.name])} onChange={(e) => setForm((c) => ({ ...c, [f.name]: e.target.value }))} error={errors[f.name]} />
          ))}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((c) => ({ ...c, is_default: e.target.checked }))} /> Đặt làm mặc định
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={save.isPending} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">{save.isPending ? "Đang lưu..." : "Lưu địa chỉ"}</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2">Huỷ</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => open("new")} className="rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700">+ Thêm địa chỉ</button>
      )}
    </div>
  );
}
