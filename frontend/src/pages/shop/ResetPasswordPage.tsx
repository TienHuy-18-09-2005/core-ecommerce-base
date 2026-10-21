import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../app/useToast.ts";
import { FormField } from "../../components/common/FormField.tsx";
import { authService } from "../../services/authService.ts";
import { validateNewPassword } from "../../utils/authValidation.ts";
import { errorMessage, firstFieldErrors } from "../../utils/fieldErrors.ts";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [local, setLocal] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => authService.resetPassword({ token, email, password, password_confirmation: confirmation }),
    onSuccess: (message) => {
      showSuccess(message || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      navigate("/dang-nhap", { replace: true });
    },
  });

  if (!token || !email) {
    return (
      <section className="mx-auto max-w-md rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-bold text-slate-900">Liên kết không hợp lệ</h1>
        <p className="mt-4 text-sm text-slate-600">
          Liên kết đặt lại mật khẩu thiếu thông tin. <Link to="/quen-mat-khau" className="font-semibold text-blue-700">Yêu cầu liên kết mới</Link>
        </p>
      </section>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateNewPassword(password, confirmation);
    setLocal(found);
    if (Object.keys(found).length === 0 && !mutation.isPending) {
      mutation.mutate();
    }
  };
  const errors = { ...firstFieldErrors(mutation.error), ...local };

  return (
    <section aria-labelledby="dat-lai-mat-khau" className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 id="dat-lai-mat-khau" className="text-2xl font-bold text-slate-900">Đặt lại mật khẩu</h1>
      <p className="mt-2 text-sm text-slate-600">Tài khoản: <strong>{email}</strong></p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormField label="Mật khẩu mới" name="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <FormField label="Xác nhận mật khẩu mới" name="password_confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} error={errors.password_confirmation} />
        {mutation.isError && !errors.password && !errors.password_confirmation ? (
          <p role="alert" className="text-sm text-red-700">
            {errors.email ?? errorMessage(mutation.error)}{" "}
            <Link to="/quen-mat-khau" className="font-semibold underline">Yêu cầu liên kết mới</Link>
          </p>
        ) : null}
        <button type="submit" disabled={mutation.isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
          {mutation.isPending ? "Đang lưu..." : "Đặt lại mật khẩu"}
        </button>
      </form>
    </section>
  );
}
