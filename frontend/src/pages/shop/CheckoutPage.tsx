import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../app/useToast.ts";
import { CartSummaryBox } from "../../components/shop/cart/CartSummaryBox.tsx";
import { Breadcrumb } from "../../components/shop/catalog/Breadcrumb.tsx";
import { cartQueryKey, useCartQuery } from "../../hooks/useCartQuery.ts";
import { notifyCartChanged } from "../../hooks/useCrossTabSync.ts";
import { ApiError } from "../../services/apiError.ts";
import { couponService } from "../../services/couponService.ts";
import { orderService } from "../../services/orderService.ts";
import { cartSignature } from "../../types/cart.ts";
import type { CheckoutInput, CouponPreview } from "../../types/order.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { CHECKOUT_FIELDS as FIELDS, EMPTY_CHECKOUT_FORM as EMPTY_FORM, validateCheckout, type CheckoutFieldName as FieldName, type CheckoutFormFields as FormFields } from "../../utils/checkoutForm.ts";
import { normalizeVnPhone } from "../../utils/vnPhone.ts";

function newKey(): string {
  return crypto.randomUUID();
}

/** Task 3.4: COD only, Idempotency-Key theo nội dung giỏ, chặn double submit, giữ form khi lỗi. */
export function CheckoutPage() {
  const cart = useCartQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [couponInput, setCouponInput] = useState("");
  const [preview, setPreview] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const submitting = useRef(false);

  // Key mới khi giỏ thay đổi; giữ nguyên khi retry cùng giỏ
  const signature = cartSignature(cart.data);
  const [idem, setIdem] = useState(() => ({ signature, key: newKey() }));
  if (idem.signature !== signature) {
    setIdem({ signature, key: newKey() });
    // Preview coupon cũ không còn đúng với giỏ mới
    if (preview) {
      setPreview(null);
    }
  }

  const applyCoupon = useMutation({
    mutationFn: (code: string) => couponService.check(code),
    onSuccess: (data) => {
      setPreview(data);
      setCouponError(null);
    },
    onError: (error) => {
      setPreview(null);
      setCouponError(error instanceof ApiError ? error.message : "Không kiểm tra được mã giảm giá.");
    },
  });

  const placeOrder = useMutation({
    mutationFn: (input: CheckoutInput) => orderService.createOrder(input, idem.key),
    onSuccess: ({ order }) => {
      const shownTotal = preview?.total ?? cart.data?.summary?.total;
      queryClient.setQueryData(cartQueryKey, { id: 0, user_id: null, items: [] });
      void queryClient.invalidateQueries({ queryKey: cartQueryKey });
      notifyCartChanged();
      navigate(`/dat-hang-thanh-cong/${encodeURIComponent(order.order_code)}`, {
        replace: true,
        state: { order, priceChanged: shownTotal !== undefined && shownTotal !== order.total_amount },
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.fieldErrors) {
          const next: Partial<Record<FieldName, string>> = {};
          for (const [key, messages] of Object.entries(error.fieldErrors)) {
            if (key in EMPTY_FORM) {
              next[key as FieldName] = messages[0];
            }
          }
          setErrors(next);
        }
        if (error.code.startsWith("COUPON_")) {
          setPreview(null);
          setCouponError(error.message);
        }
        if (error.code === "STOCK_UNAVAILABLE" || error.code === "PRODUCT_UNAVAILABLE" || error.code === "CART_EMPTY") {
          void queryClient.invalidateQueries({ queryKey: cartQueryKey });
        }
      }
      showError(error);
    },
    onSettled: () => {
      submitting.current = false;
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || placeOrder.isPending) {
      return;
    }
    const found = validateCheckout(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    submitting.current = true;
    placeOrder.mutate({
      ...form,
      customer_phone: normalizeVnPhone(form.customer_phone),
      customer_email: form.customer_email?.trim() || undefined,
      customer_note: form.customer_note?.trim() || undefined,
      payment_method: "cod",
      coupon_code: preview?.code,
    });
  };

  if (cart.isLoading) {
    return <p>Đang tải giỏ hàng...</p>;
  }
  if (cart.isError) {
    return (
      <p role="alert" className="text-red-700">
        Không tải được giỏ hàng.{" "}
        <button type="button" className="font-semibold underline" onClick={() => cart.refetch()}>Thử lại</button>
      </p>
    );
  }

  const items = cart.data?.items ?? [];
  const summary = cart.data?.summary;
  if (items.length === 0 || !summary) {
    return (
      <p className="text-slate-600">
        Giỏ hàng đang trống. <Link to="/san-pham" className="font-semibold text-blue-700">Xem sản phẩm</Link>
      </p>
    );
  }

  return (
    <section aria-labelledby="thanh-toan">
      <Breadcrumb items={[{ label: "Trang chủ", to: "/" }, { label: "Giỏ hàng", to: "/gio-hang" }, { label: "Thanh toán" }]} />
      <h1 id="thanh-toan" className="mb-4 text-2xl font-bold">Thanh toán</h1>
      <form onSubmit={onSubmit} noValidate className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold">Thông tin giao hàng</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <label key={field.name} className={`text-sm font-medium ${field.name === "shipping_address" ? "sm:col-span-2" : ""}`}>
                {field.label}
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  autoComplete={field.autoComplete}
                  value={form[field.name] ?? ""}
                  aria-invalid={errors[field.name] ? true : undefined}
                  aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
                  onChange={(e) => setForm((current) => ({ ...current, [field.name]: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                {errors[field.name] ? (
                  <span id={`${field.name}-error`} className="mt-1 block text-xs text-red-700">{errors[field.name]}</span>
                ) : null}
              </label>
            ))}
            <label className="text-sm font-medium sm:col-span-2">
              Ghi chú đơn hàng
              <textarea
                name="customer_note"
                maxLength={1000}
                value={form.customer_note ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, customer_note: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <fieldset>
            <legend className="font-bold">Phương thức thanh toán</legend>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="radio" name="payment_method" value="cod" checked readOnly /> COD — Thanh toán khi nhận hàng
            </label>
          </fieldset>
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold">Đơn hàng của bạn</h2>
          <ul className="divide-y text-sm">
            {items.map((line) => (
              <li key={line.id} className="flex justify-between gap-2 py-2">
                <span>{line.product_name}{line.variant_name ? ` (${line.variant_name})` : ""} × {line.quantity}</span>
                <span className="tabular-nums">{formatCurrency(line.line_total ?? 0)}</span>
              </li>
            ))}
          </ul>
          <div>
            <label htmlFor="coupon" className="text-sm font-medium">Mã giảm giá</label>
            <div className="mt-1 flex gap-2">
              <input
                id="coupon"
                value={couponInput}
                maxLength={50}
                onChange={(e) => setCouponInput(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 uppercase"
              />
              {preview ? (
                <button type="button" className="rounded-lg border px-3 text-sm" onClick={() => { setPreview(null); setCouponInput(""); }}>
                  Bỏ mã
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border border-blue-600 px-3 text-sm font-semibold text-blue-700 disabled:opacity-50"
                  disabled={!couponInput.trim() || applyCoupon.isPending}
                  onClick={() => applyCoupon.mutate(couponInput.trim())}
                >
                  {applyCoupon.isPending ? "Đang kiểm tra..." : "Áp dụng"}
                </button>
              )}
            </div>
            {couponError ? <p role="alert" className="mt-1 text-xs text-red-700">{couponError}</p> : null}
          </div>
          <CartSummaryBox summary={summary} preview={preview} />
          {summary.has_issues ? (
            <p role="alert" className="text-sm text-red-700">
              Giỏ có sản phẩm hết hàng/ngừng bán. <Link to="/gio-hang" className="underline">Cập nhật giỏ hàng</Link>
            </p>
          ) : null}
          <button
            type="submit"
            disabled={placeOrder.isPending || summary.has_issues}
            className="w-full rounded-lg bg-red-600 px-4 py-3 font-bold text-white disabled:bg-slate-300"
          >
            {placeOrder.isPending ? "Đang đặt hàng..." : "ĐẶT HÀNG NGAY"}
          </button>
        </aside>
      </form>
    </section>
  );
}
