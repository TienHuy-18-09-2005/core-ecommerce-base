import { Link } from "react-router-dom";
import { useCartQuery } from "../../hooks/useCartQuery.ts";
import { cartItemCount } from "../../types/cart.ts";

export function CartPage() {
  const cart = useCartQuery();
  const count = cartItemCount(cart.data);

  return (
    <section aria-labelledby="gio-hang-tieu-de">
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
        <ul className="mt-4 space-y-2">
          {cart.data.items.map((item) => (
            <li key={item.id} className="rounded-xl bg-white p-4">
              Mặt hàng #{item.product_variant_id}: {item.quantity}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
