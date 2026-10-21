import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/useAuth.ts";
import { FormField } from "../../components/common/FormField.tsx";
import { safeRedirect } from "../../types/auth.ts";
import { errorMessage, firstFieldErrors } from "../../utils/fieldErrors.ts";

/** Task 4.3: server throttle 5/phút; lỗi sai thông tin luôn là thông báo chung. */
export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const mutation = useMutation({
    mutationFn: () => login({ email: email.trim(), password, remember }),
    onSuccess: () => navigate(redirect, { replace: true }),
  });

  if (user && !mutation.isPending && !mutation.isSuccess) {
    return <Navigate to={redirect} replace />;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!mutation.isPending) {
      mutation.mutate();
    }
  };
  const fields = firstFieldErrors(mutation.error);

  return (
    <section aria-labelledby="dang-nhap" className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 id="dang-nhap" className="text-2xl font-bold text-slate-900">Đăng nhập</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormField label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fields.email} />
        <FormField label="Mật khẩu" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={fields.password} />
        <div className="flex items-center justify-between gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Ghi nhớ đăng nhập
          </label>
          <Link to="/quen-mat-khau" className="font-semibold text-blue-700">Quên mật khẩu?</Link>
        </div>
        {mutation.isError && Object.keys(fields).length === 0 ? (
          <p role="alert" className="text-sm text-red-700">{errorMessage(mutation.error)}</p>
        ) : null}
        <button type="submit" disabled={mutation.isPending || !email || !password} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
          {mutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Chưa có tài khoản? <Link to={`/dang-ky${redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""}`} className="font-semibold text-blue-700">Đăng ký</Link>
      </p>
    </section>
  );
}
