import { Link } from "react-router-dom";
import { contactFromSettings, footerLinks, shopContact } from "./shopContact.ts";
import { usePublicSettings } from "../../hooks/usePublicSettings.ts";

export function Footer() {
  const { data } = usePublicSettings();
  const phone = contactFromSettings(data?.store.phone);
  const email = data?.store.email?.trim() || shopContact.email;
  return (
    <footer className="theme-fixed mt-12 border-t border-slate-200 bg-slate-900 text-slate-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="text-lg font-bold">{data?.store.name || "Đồ Điện Siêu Xịn"}</p>
          {data?.store.address && <p className="mt-1 text-sm text-slate-300">{data.store.address}</p>}
          <p className="mt-2 text-sm text-slate-300">
            Thiết bị điện dân dụng và công trình. Giá trên trang là giá niêm yết từ máy chủ.
          </p>
        </div>
        <nav aria-label="Chính sách">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Thông tin</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className="hover:text-white">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Liên hệ</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              Hotline{" "}
              <a href={phone.phoneHref} className="font-semibold text-amber-300">
                {phone.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
