import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useAuth } from "../../../app/useAuth.ts";
import { useToast } from "../../../app/useToast.ts";
import { FormField } from "../../../components/common/FormField.tsx";
import { accountService } from "../../../services/accountService.ts";
import type { User } from "../../../types/auth.ts";
import { firstFieldErrors } from "../../../utils/fieldErrors.ts";
import { isValidVnPhone, normalizeVnPhone } from "../../../utils/vnPhone.ts";

export function ProfileTab({ user }: { user: User }) {
  const { setUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [local, setLocal] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: () => accountService.updateProfile({ name: name.trim(), phone: phone.trim() ? normalizeVnPhone(phone) : null }),
    onSuccess: (u) => { setUser(u); showSuccess("Đã cập nhật thông tin."); },
    onError: showError,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Vui lòng nhập họ tên.";
    if (phone.trim() && !isValidVnPhone(phone)) errs.phone = "Số điện thoại không hợp lệ.";
    setLocal(errs);
    if (Object.keys(errs).length === 0) save.mutate();
  };
  const errors = { ...firstFieldErrors(save.error), ...local };

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
      <FormField label="Email (không đổi được)" name="email" value={user.email} disabled readOnly />
      <FormField label="Họ và tên" name="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
      <FormField label="Số điện thoại" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} />
      <button type="submit" disabled={save.isPending} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
        {save.isPending ? "Đang lưu..." : "Lưu thay đổi"}
      </button>
    </form>
  );
}
