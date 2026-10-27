import { Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useRemoveCartItemMutation, useUpdateCartItemMutation } from "../../../hooks/useCartQuery.ts";
import { CART_WARNING_LABELS, type CartLine } from "../../../types/cart.ts";
import { formatCurrency } from "../../../utils/formatCurrency.ts";
import { ProductImage } from "../ProductImage.tsx";
import { QuantityStepper } from "./QuantityStepper.tsx";

export function CartLineItem({ line, compact = false }: { line: CartLine; compact?: boolean }) {
  const update = useUpdateCartItemMutation();
  const remove = useRemoveCartItemMutation();
  const name = line.product_name ?? `Sản phẩm #${line.product_variant_id}`;
  const unavailable = line.warning === "UNAVAILABLE" || line.warning === "OUT_OF_STOCK";

  return (
    <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3" data-testid="cart-line">
      <ProductImage src={line.image_url ?? undefined} alt={name} className={`${compact ? "h-16 w-16" : "h-20 w-20"} shrink-0 rounded-lg object-cover`} />
      <div className="min-w-0 flex-1">
        {line.product_slug ? (
          <Link to={`/san-pham/${line.product_slug}`} className="font-semibold text-slate-900 hover:text-blue-700">{name}</Link>
        ) : (
          <p className="font-semibold text-slate-900">{name}</p>
        )}
        {line.variant_name ? <p className="text-sm text-slate-600">{line.variant_name}</p> : null}
        <p className="text-sm tabular-nums text-slate-700">{formatCurrency(line.unit_price ?? 0)}</p>
        {line.warning ? (
          <p role="alert" className="mt-1 text-sm font-medium text-red-700">
            {CART_WARNING_LABELS[line.warning]}
            {line.warning === "INSUFFICIENT_STOCK" ? ` (còn ${line.stock_quantity ?? 0})` : null}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <QuantityStepper
            value={line.quantity}
            max={unavailable ? line.quantity : Math.max(line.stock_quantity ?? line.quantity, 1)}
            label={`Số lượng ${name}`}
            disabled={unavailable || remove.isPending}
            onCommit={(quantity) => update.mutate({ itemId: line.id, quantity })}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-red-700 disabled:opacity-50"
            onClick={() => remove.mutate(line.id)}
            disabled={remove.isPending}
            aria-label={`Xóa ${name} khỏi giỏ`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa
          </button>
          <span className="ml-auto font-semibold tabular-nums">{formatCurrency(line.line_total ?? 0)}</span>
        </div>
      </div>
    </li>
  );
}
