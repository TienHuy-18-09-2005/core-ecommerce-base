import { useMutation } from "@tanstack/react-query";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/useAuth.ts";
import { FormField } from "../../components/common/FormField.tsx";
import { safeRedirect } from "../../types/auth.ts";
import { errorMessage, firstFieldErrors } from "../../utils/fieldErrors.ts";
import { validateRegister, type RegisterFields as Fields } from "../../utils/authValidation.ts";
import { normalizeVnPhone } from "../../utils/vnPhone.ts";

/** Task 4.4: server throttle 5/phút. */
export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));
  const [form, setForm] = useState<Fields>({ name: "", email: "", phone: "", password: "", password_confirmation: "" });
  const [local, setLocal] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => register({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() ? normalizeVnPhone(form.phone) : undefined,
      password: form.password,
      password_confirmation: form.password_confirmation,
    }),
    onSuccess: () => navigate(redirect, { replace: true }),
  });

  if (user && !mutation.isPending && !mutation.isSuccess) {
    return <Navigate to={redirect} replace />;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validateRegister(form);
    setLocal(found);
    if (Object.keys(found).length === 0 && !mutation.isPending) {
      mutation.mutate();
    }
  };
  const errors = { ...firstFieldErrors(mutation.error), ...local };
  const set = (key: keyof Fields) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <section aria-labelledby="dang-ky" className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 id="dang-ky" className="text-2xl font-bold text-slate-900">Đăng ký tài khoản</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <FormField label="Họ và tên" name="name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <FormField label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <FormField label="Số điện thoại (không bắt buộc)" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} error={errors.phone} />
        <FormField label="Mật khẩu" name="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} />
        <FormField label="Xác nhận mật khẩu" name="password_confirmation" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={set("password_confirmation")} error={errors.password_confirmation} />
        {mutation.isError && Object.keys(errors).length === 0 ? (
          <p role="alert" className="text-sm text-red-700">{errorMessage(mutation.error)}</p>
        ) : null}
        <button type="submit" disabled={mutation.isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
          {mutation.isPending ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Đã có tài khoản? <Link to="/dang-nhap" className="font-semibold text-blue-700">Đăng nhập</Link>
      </p>
    </section>
  );
}
