import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authQueryKey } from "../../app/useAuth.ts";
import { authService } from "../../services/authService.ts";
import { errorMessage } from "../../utils/fieldErrors.ts";

/** Trang đích của link trong email: chuyển nguyên id/hash/expires/signature cho API kiểm chữ ký. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const link = {
    id: params.get("id") ?? "",
    hash: params.get("hash") ?? "",
    expires: params.get("expires") ?? "",
    signature: params.get("signature") ?? "",
  };
  const complete = Object.values(link).every(Boolean);
  const queryClient = useQueryClient();

  const verify = useQuery({
    queryKey: ["auth", "verify-email", link],
    queryFn: () => authService.verifyEmail(link),
    enabled: complete,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (verify.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: authQueryKey });
    }
  }, [verify.isSuccess, queryClient]);

  return (
    <section aria-labelledby="xac-thuc-email" className="mx-auto max-w-md rounded-2xl bg-white p-8">
      <h1 id="xac-thuc-email" className="text-2xl font-bold text-slate-900">Xác thực email</h1>
      {!complete ? (
        <p role="alert" className="mt-4 text-sm text-red-700">Liên kết xác thực không hợp lệ.</p>
      ) : verify.isPending ? (
        <p className="mt-4 text-sm text-slate-600">Đang xác thực...</p>
      ) : verify.isError ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {errorMessage(verify.error)} Đăng nhập rồi bấm “Gửi lại email” để nhận liên kết mới.
        </p>
      ) : (
        <p role="status" className="mt-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          {verify.data || "Xác thực email thành công."}
        </p>
      )}
      <p className="mt-4 text-sm"><Link to="/" className="font-semibold text-blue-700">Tiếp tục mua sắm</Link></p>
    </section>
  );
}
