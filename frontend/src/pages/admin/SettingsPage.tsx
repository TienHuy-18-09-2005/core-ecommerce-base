import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Check, Info, KeyRound, Store, Truck, X } from "lucide-react";
import { FormField, useSaveShortcut, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
import { Skeleton } from "../../components/admin/feedback.tsx";
import { PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useToast } from "../../app/useToast.ts";
import { useCan } from "../../hooks/useCan.ts";
import { useAdminPasswordMutation, useAdminSettingsQuery, useSettingsMutation } from "../../hooks/useAdminQuery.ts";
import type { ShopSettingsValues } from "../../types/admin.ts";
import { btnPrimary, btnSecondary, inputClass } from "../../utils/adminFormat.ts";
import { ApiError } from "../../services/apiError.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";

type Tab = "store" | "shipping" | "account";
const TABS: { id: Tab; label: string; icon: typeof Store }[] = [
  { id: "store", label: "Thông tin cửa hàng", icon: Store },
  { id: "shipping", label: "Vận chuyển", icon: Truck },
  { id: "account", label: "Tài khoản", icon: KeyRound },
];
const SECTION_KEYS: Record<"store" | "shipping", (keyof ShopSettingsValues)[]> = {
  store: ["store_name", "store_phone", "store_address"],
  shipping: ["shipping_fee", "free_shipping_threshold"],
};

/** Quy tắc mật khẩu quản trị — khớp AdminPasswordRequest (backend luôn kiểm tra lại). */
export const PASSWORD_RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "Ít nhất 10 ký tự", test: (v) => v.length >= 10 },
  { label: "Có chữ hoa và chữ thường", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v) },
  { label: "Có chữ số", test: (v) => /\d/.test(v) },
  { label: "Có ký tự đặc biệt (vd. @ # !)", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

/** R7: Cài đặt — thông tin cửa hàng, phí vận chuyển (xem: settings.view, sửa: settings.manage) và đổi mật khẩu (mọi user quản trị). */
export default function SettingsPage() {
  const can = useCan();
  const canView = can(["settings.view", "settings.manage"]);
  const tabs = TABS.filter((t) => t.id === "account" || canView);
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = tabs.some((t) => t.id === requested) ? (requested as Tab) : tabs[0].id;
  const select = (t: Tab) => setParams((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; }, { replace: true });
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = tabs[(i + d + tabs.length) % tabs.length].id;
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <PageHeader title="Cài đặt" />
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div role="tablist" aria-label="Mục cài đặt" aria-orientation="vertical"
          className="flex gap-1 overflow-x-auto border-b border-admin-border md:w-56 md:shrink-0 md:flex-col md:border-b-0">
          {tabs.map((t, i) => {
            const on = t.id === tab;
            return (
              <button key={t.id} ref={(el) => { tabRefs.current[t.id] = el; }} type="button" role="tab" id={`tab-${t.id}`} aria-controls={`panel-${t.id}`}
                aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => select(t.id)} onKeyDown={(e) => onKey(e, i)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary ${on ? "bg-admin-primary-subtle text-admin-primary" : "text-admin-fg-soft hover:bg-admin-subtle"}`}>
                <t.icon aria-hidden className="size-4" />{t.label}
              </button>
            );
          })}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="min-w-0 flex-1">
          {tab === "account" ? <PasswordSection /> : <SettingsSection key={tab} section={tab} canEdit={can("settings.manage")} />}
        </div>
      </div>
    </>
  );
}

function Card({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="max-w-2xl rounded-xl border border-admin-border bg-admin-surface p-5 shadow-sm">
      <h2 className="text-base font-semibold text-admin-fg">{title}</h2>
      {description && <p className="mt-1 text-sm text-admin-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

type Draft = Record<keyof ShopSettingsValues, string>;
const toDraft = (v: ShopSettingsValues): Draft => ({
  store_name: v.store_name ?? "", store_phone: v.store_phone ?? "", store_address: v.store_address ?? "",
  shipping_fee: String(v.shipping_fee ?? 0), free_shipping_threshold: v.free_shipping_threshold ? String(v.free_shipping_threshold) : "",
});

function SettingsSection({ section, canEdit }: { section: "store" | "shipping"; canEdit: boolean }) {
  const { data, error, isLoading, refetch, isRefetching } = useAdminSettingsQuery();
  if (isLoading) return <Card title="Đang tải…"><div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div></Card>;
  if (error || !data) return <QueryError error={error} onRetry={refetch} retrying={isRefetching} />;
  return <SettingsForm section={section} canEdit={canEdit} initial={toDraft(data)} defaults={data.defaults} />;
}

function SettingsForm({ section, canEdit, initial, defaults }: { section: "store" | "shipping"; canEdit: boolean; initial: Draft; defaults: ShopSettingsValues }) {
  const keys = SECTION_KEYS[section];
  const pick = (d: Draft) => Object.fromEntries(keys.map((k) => [k, d[k]])) as Partial<Draft>;
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useSettingsMutation();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const { isDirty, markClean, prompt } = useUnsavedChanges(pick(draft));
  useSaveShortcut(form);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!isDirty()) { toast.showSuccess("Không có thay đổi để lưu."); return; }
    const body: Partial<ShopSettingsValues> = section === "store"
      ? { store_name: draft.store_name, store_phone: draft.store_phone, store_address: draft.store_address }
      : { shipping_fee: Number(draft.shipping_fee || 0), free_shipping_threshold: draft.free_shipping_threshold === "" ? 0 : Number(draft.free_shipping_threshold) };
    setErrors({});
    save.mutate(body, {
      onSuccess: (res) => { const next = toDraft(res); setDraft(next); markClean(pick(next)); toast.showSuccess("Đã lưu cài đặt."); },
      onError: (err) => { setErrors(firstFieldErrors(err)); toast.showError(err); },
    });
  };
  const reset = () => { setDraft(initial); setErrors({}); };
  const num = (v: string) => (v === "" ? null : Number(v));
  const fee = num(draft.shipping_fee) ?? 0;
  const threshold = num(draft.free_shipping_threshold);

  return (
    <form ref={form} onSubmit={onSubmit} noValidate aria-label={section === "store" ? "Thông tin cửa hàng" : "Vận chuyển"}>
      {prompt}
      {section === "store" ? (
        <Card title="Thông tin cửa hàng" description="Hiển thị trên phiếu giao hàng và chân trang cửa hàng.">
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tên cửa hàng" required error={errors.store_name} className="sm:col-span-2" hint={`Mặc định: ${defaults.store_name}`}>
              <input className={inputClass} value={draft.store_name} onChange={set("store_name")} maxLength={150} autoComplete="organization" />
            </FormField>
            <FormField label="Số điện thoại" required error={errors.store_phone} hint="Ví dụ: 028 1234 5678">
              <input className={inputClass} value={draft.store_phone} onChange={set("store_phone")} inputMode="tel" autoComplete="tel" maxLength={20} />
            </FormField>
            <FormField label="Địa chỉ" required error={errors.store_address} className="sm:col-span-2">
              <textarea className={`${inputClass} min-h-20`} value={draft.store_address} onChange={set("store_address")} maxLength={500} autoComplete="street-address" />
            </FormField>
          </fieldset>
        </Card>
      ) : (
        <Card title="Phí vận chuyển" description="Áp dụng cho giỏ hàng và thanh toán ngay sau khi lưu.">
          <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
            <FormField label="Phí vận chuyển mặc định (₫)" required error={errors.shipping_fee} hint={`Mặc định hệ thống: ${formatCurrency(defaults.shipping_fee)}`}>
              <input className={inputClass} type="number" min={0} step={1000} inputMode="numeric" value={draft.shipping_fee} onChange={set("shipping_fee")} />
            </FormField>
            <FormField label="Ngưỡng miễn phí vận chuyển (₫)" error={errors.free_shipping_threshold} hint="Để trống hoặc 0 để tắt.">
              <input className={inputClass} type="number" min={0} step={1000} inputMode="numeric" value={draft.free_shipping_threshold} onChange={set("free_shipping_threshold")} />
            </FormField>
          </fieldset>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-admin-subtle p-3 text-sm text-admin-fg-soft" aria-live="polite">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-admin-primary" />
            {threshold && threshold > 0
              ? `Đơn có tạm tính từ ${formatCurrency(threshold)} được miễn phí vận chuyển; đơn thấp hơn tính ${formatCurrency(fee)}.`
              : `Mọi đơn tính phí vận chuyển ${formatCurrency(fee)}.`}
          </p>
        </Card>
      )}
      {canEdit ? (
        <div className="mt-4 flex max-w-2xl flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-admin-muted">Nhấn Ctrl+S để lưu nhanh</span>
          <button type="button" className={btnSecondary} onClick={reset} disabled={save.isPending}>Hoàn tác</button>
          <button type="submit" className={btnPrimary} disabled={save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu thay đổi"}</button>
        </div>
      ) : (
        <p className="mt-4 max-w-2xl text-sm text-admin-muted">Bạn chỉ có quyền xem. Liên hệ quản trị viên để thay đổi.</p>
      )}
    </form>
  );
}

function PasswordSection() {
  const empty = { current_password: "", password: "", password_confirmation: "" };
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const change = useAdminPasswordMutation();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  useSaveShortcut(form);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  const passed = useMemo(() => PASSWORD_RULES.map((r) => r.test(v.password)), [v.password]);
  const mismatch = v.password_confirmation !== "" && v.password_confirmation !== v.password;
  useEffect(() => { if (errors.password_confirmation && !mismatch) setErrors((e) => ({ ...e, password_confirmation: "" })); }, [mismatch, errors.password_confirmation]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!v.current_password) local.current_password = "Vui lòng nhập mật khẩu hiện tại.";
    if (!passed.every(Boolean)) local.password = "Mật khẩu mới chưa đủ mạnh.";
    if (v.password !== v.password_confirmation) local.password_confirmation = "Mật khẩu xác nhận không khớp.";
    setErrors(local);
    if (Object.keys(local).length) return;
    change.mutate(v, {
      onSuccess: (msg) => { setV(empty); toast.showSuccess(msg ?? "Đã đổi mật khẩu."); },
      onError: (err) => {
        const fe = firstFieldErrors(err);
        if (err instanceof ApiError && err.code === "WRONG_PASSWORD") fe.current_password = err.message;
        setErrors(fe);
        toast.showError(err);
      },
    });
  };

  return (
    <form ref={form} onSubmit={onSubmit} noValidate aria-label="Đổi mật khẩu">
      <Card title="Đổi mật khẩu" description="Sau khi đổi, các phiên đăng nhập khác của bạn sẽ bị đăng xuất.">
        <div className="grid gap-4">
          <FormField label="Mật khẩu hiện tại" required error={errors.current_password}>
            <input className={inputClass} type="password" autoComplete="current-password" value={v.current_password} onChange={set("current_password")} />
          </FormField>
          <FormField label="Mật khẩu mới" required error={errors.password} hint={<PasswordRules passed={passed} />}>
            <input className={inputClass} type="password" autoComplete="new-password" value={v.password} onChange={set("password")} />
          </FormField>
          <FormField label="Nhập lại mật khẩu mới" required error={errors.password_confirmation || (mismatch ? "Mật khẩu xác nhận không khớp." : undefined)}>
            <input className={inputClass} type="password" autoComplete="new-password" value={v.password_confirmation} onChange={set("password_confirmation")} />
          </FormField>
        </div>
      </Card>
      <div className="mt-4 flex max-w-2xl justify-end">
        <button type="submit" className={btnPrimary} disabled={change.isPending}>{change.isPending ? "Đang đổi…" : "Đổi mật khẩu"}</button>
      </div>
    </form>
  );
}

function PasswordRules({ passed }: { passed: boolean[] }) {
  return (
    <ul className="mt-1 grid gap-0.5 sm:grid-cols-2" aria-label="Yêu cầu mật khẩu">
      {PASSWORD_RULES.map((r, i) => (
        <li key={r.label} className={`flex items-center gap-1 ${passed[i] ? "text-admin-success" : "text-admin-muted"}`}>
          {passed[i] ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
          {r.label}<span className="sr-only">{passed[i] ? ": đạt" : ": chưa đạt"}</span>
        </li>
      ))}
    </ul>
  );
}
