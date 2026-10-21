import { Breadcrumb } from "../../components/shop/catalog/Breadcrumb.tsx";
import { OrderLookupForm } from "../../components/shop/order/OrderLookupForm.tsx";

export function OrderLookupPage() {
  return (
    <section aria-labelledby="tra-cuu-don" className="mx-auto max-w-3xl">
      <Breadcrumb items={[{ label: "Trang chủ", to: "/" }, { label: "Tra cứu đơn hàng" }]} />
      <h1 id="tra-cuu-don" className="mb-4 text-2xl font-bold">Tra cứu đơn hàng</h1>
      <OrderLookupForm />
    </section>
  );
}
