import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { FormField } from "../../components/common/FormField.tsx";
import { authService } from "../../services/authService.ts";
import { errorMessage, firstFieldErrors } from "../../utils/fieldErrors.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Thông điệp thành công luôn giống nhau dù email có tồn tại hay không. */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [local, setLocal] = useState<string | undefined>();
  const mutation = useMutation({ mutationFn: (value: string) => authService.forgotPassword(value) });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setLocal("Email không hợp lệ.");
      return;
    }
    setLocal(undefined);
    if (!mutation.isPending) {
      mutation.mutate(value);
    }
  };
  const fields = firstFieldErrors(mutation.error);

  return (
    <section aria-labelledby="quen-mat-khau" className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 id="quen-mat-khau" className="text-2xl font-bold text-slate-900">Quên mật khẩu</h1>
      {mutation.isSuccess ? (
        <p role="status" className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">{mutation.data}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <p className="text-sm text-slate-600">Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.</p>
          <FormField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={local ?? fields.email} />
          {mutation.isError && !fields.email ? <p role="alert" className="text-sm text-red-700">{errorMessage(mutation.error)}</p> : null}
          <button type="submit" disabled={mutation.isPending} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
            {mutation.isPending ? "Đang gửi..." : "Gửi liên kết"}
          </button>
        </form>
      )}
      <p className="mt-4 text-sm text-slate-600"><Link to="/dang-nhap" className="font-semibold text-blue-700">Quay lại đăng nhập</Link></p>
    </section>
  );
}
