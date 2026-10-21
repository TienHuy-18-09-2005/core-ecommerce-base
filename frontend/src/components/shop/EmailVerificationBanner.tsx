import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../app/useAuth.ts";
import { authService } from "../../services/authService.ts";
import { errorMessage } from "../../utils/fieldErrors.ts";

/** Nhắc tài khoản chưa xác thực email: vẫn mua sắm được, chỉ chặn đặt hàng bằng tài khoản. */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const resend = useMutation({ mutationFn: () => authService.resendVerification() });

  if (!user || user.email_verified) {
    return null;
  }

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p>
        Email <strong>{user.email}</strong> chưa được xác thực. Bạn vẫn có thể xem sản phẩm và thêm vào giỏ,
        nhưng cần xác thực để đặt hàng bằng tài khoản.
      </p>
      <div className="flex items-center gap-3">
        {resend.isSuccess ? <span>{resend.data || "Đã gửi lại email xác thực."}</span> : null}
        {resend.isError ? <span className="text-red-700">{errorMessage(resend.error)}</span> : null}
        <button
          type="button"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
          className="rounded-lg border border-amber-500 px-3 py-1 font-semibold disabled:opacity-50"
        >
          {resend.isPending ? "Đang gửi..." : "Gửi lại email"}
        </button>
      </div>
    </div>
  );
}
