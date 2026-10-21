import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useToast } from "../../../app/useToast.ts";
import { FormField } from "../../../components/common/FormField.tsx";
import { accountService } from "../../../services/accountService.ts";
import { validateNewPassword } from "../../../utils/authValidation.ts";
import { errorMessage, firstFieldErrors } from "../../../utils/fieldErrors.ts";

/** Đổi mật khẩu bắt buộc mật khẩu cũ (server kiểm, throttle 5/phút). */
export function PasswordTab() {
  const { showSuccess } = useToast();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [local, setLocal] = useState<Record<string, string>>({});
  const change = useMutation({
    mutationFn: () => accountService.changePassword({ current_password: current, password, password_confirmation: confirm }),
    onSuccess: () => {
      setCurrent(""); setPassword(""); setConfirm("");
      showSuccess("Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateNewPassword(password, confirm);
    if (!current) errs.current_password = "Vui lòng nhập mật khẩu hiện tại.";
    setLocal(errs);
    if (Object.keys(errs).length === 0) change.mutate();
  };
  const fieldErrs = firstFieldErrors(change.error);
  const errors = { ...fieldErrs, ...local };

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4" noValidate>
      <FormField label="Mật khẩu hiện tại" name="current_password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current_password} />
      <FormField label="Mật khẩu mới" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <FormField label="Xác nhận mật khẩu mới" name="password_confirmation" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.password_confirmation} />
      {change.isError && Object.keys(fieldErrs).length === 0 ? <p role="alert" className="text-sm text-red-700">{errorMessage(change.error)}</p> : null}
      <button type="submit" disabled={change.isPending} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
        {change.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
