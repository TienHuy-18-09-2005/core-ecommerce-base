import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError } from "../../../services/apiError.ts";
import { orderService } from "../../../services/orderService.ts";
import { isValidVnPhone, normalizeVnPhone } from "../../../utils/vnPhone.ts";
import { OrderSummaryView } from "./OrderSummaryView.tsx";

/** §3.D: tra cứu đơn khách bằng mã đơn + SĐT (server so khớp, throttle 5/phút, che PII). */
export function OrderLookupForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [phone, setPhone] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const lookup = useMutation({ mutationFn: () => orderService.lookup(code.trim(), normalizeVnPhone(phone)) });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim() || !isValidVnPhone(phone)) {
      setLocalError("Vui lòng nhập mã đơn và số điện thoại hợp lệ.");
      return;
    }
    setLocalError(null);
    lookup.mutate();
  };

  const serverError = lookup.error instanceof ApiError ? lookup.error.message : lookup.error ? "Không tra cứu được đơn hàng." : null;

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" noValidate>
        <label className="text-sm font-medium">
          Mã đơn hàng
          <input value={code} onChange={(e) => setCode(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Số điện thoại đặt hàng
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
        <button type="submit" disabled={lookup.isPending} className="self-end rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-300">
          {lookup.isPending ? "Đang tra cứu..." : "Tra cứu"}
        </button>
      </form>
      {localError || serverError ? <p role="alert" className="text-sm text-red-700">{localError ?? serverError}</p> : null}
      {lookup.data ? <OrderSummaryView order={lookup.data} /> : null}
    </div>
  );
}
