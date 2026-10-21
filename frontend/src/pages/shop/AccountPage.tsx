import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../app/useAuth.ts";
import { Breadcrumb } from "../../components/shop/catalog/Breadcrumb.tsx";
import { AddressesTab } from "./account/AddressesTab.tsx";
import { OrdersTab } from "./account/OrdersTab.tsx";
import { PasswordTab } from "./account/PasswordTab.tsx";
import { ProfileTab } from "./account/ProfileTab.tsx";

const TABS = [
  { id: "thong-tin", label: "Thông tin cá nhân" },
  { id: "don-hang", label: "Lịch sử đơn hàng" },
  { id: "dia-chi", label: "Sổ địa chỉ" },
  { id: "mat-khau", label: "Đổi mật khẩu" },
] as const;

/** Task 4.5: tab lưu trên URL (?tab=) để back/refresh giữ đúng tab. Route bọc ProtectedRoute. */
export function AccountPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = TABS.find((t) => t.id === params.get("tab"))?.id ?? "thong-tin";

  if (!user) return null;

  return (
    <section aria-labelledby="tai-khoan">
      <Breadcrumb items={[{ label: "Trang chủ", to: "/" }, { label: "Tài khoản" }]} />
      <h1 id="tai-khoan" className="mb-4 text-2xl font-bold">Xin chào, {user.name}</h1>
      <div role="tablist" aria-label="Tài khoản" className="mb-4 flex flex-wrap gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={`px-3 py-2 text-sm font-semibold ${active === t.id ? "border-b-2 border-blue-600 text-blue-700" : "text-slate-600"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="rounded-xl bg-white p-4">
        {active === "thong-tin" ? <ProfileTab key={user.id} user={user} /> : null}
        {active === "don-hang" ? <OrdersTab /> : null}
        {active === "dia-chi" ? <AddressesTab /> : null}
        {active === "mat-khau" ? <PasswordTab /> : null}
      </div>
    </section>
  );
}
