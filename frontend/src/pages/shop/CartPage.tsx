import { Link } from "react-router-dom";
import { CartLineItem } from "../../components/shop/cart/CartLineItem.tsx";
import { CartSummaryBox } from "../../components/shop/cart/CartSummaryBox.tsx";
import { Breadcrumb } from "../../components/shop/catalog/Breadcrumb.tsx";
import { useCartQuery } from "../../hooks/useCartQuery.ts";
import { cartItemCount } from "../../types/cart.ts";

export function CartPage() {
  const cart = useCartQuery();
  const count = cartItemCount(cart.data);
  const summary = cart.data?.summary;

  return (
    <section aria-labelledby="gio-hang-tieu-de">
      <Breadcrumb items={[{ label: "Trang chủ", to: "/" }, { label: "Giỏ hàng" }]} />
      <h1 id="gio-hang-tieu-de" className="text-2xl font-bold text-slate-900">Giỏ hàng</h1>
      {cart.isLoading ? <p className="mt-4">Đang tải giỏ hàng...</p> : null}
      {cart.isError ? (
        <p role="alert" className="mt-4 text-red-700">
          Không tải được giỏ hàng.{" "}
          <button type="button" className="font-semibold underline" onClick={() => cart.refetch()}>
            Thử lại
          </button>
        </p>
      ) : null}
      {cart.isSuccess && count === 0 ? (
        <p className="mt-4 text-slate-600">
          Giỏ hàng đang trống. <Link to="/san-pham" className="font-semibold text-blue-700">Xem sản phẩm</Link>
        </p>
      ) : null}
      {cart.isSuccess && count > 0 ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ul className="space-y-3">
            {cart.data.items.map((line) => <CartLineItem key={line.id} line={line} />)}
          </ul>
          {summary ? (
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4">
              <CartSummaryBox summary={summary} />
              {summary.has_issues ? (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  Một số sản phẩm hết hàng hoặc ngừng bán. Vui lòng cập nhật giỏ trước khi thanh toán.
                </p>
              ) : (
                <Link to="/thanh-toan" className="mt-4 block rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white">
                  Tiến hành thanh toán
                </Link>
              )}
            </aside>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
