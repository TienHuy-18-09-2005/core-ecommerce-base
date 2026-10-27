<?php

namespace App\Services\Shop;

use App\Models\Cart;
use App\Models\CartItem;

/**
 * Định dạng giỏ hàng cho API: giá, tạm tính, phí ship và cảnh báo đều do server tính.
 * Chỉ trả trường công khai (không có cost_price, session_id).
 */
class CartPresenter
{
    public const WARNING_UNAVAILABLE = 'UNAVAILABLE';

    public const WARNING_OUT_OF_STOCK = 'OUT_OF_STOCK';

    public const WARNING_INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK';

    public function present(Cart $cart): array
    {
        $cart->loadMissing(['items.variant.product']);

        $items = $cart->items->sortBy('id')->values()->map(fn (CartItem $item) => $this->line($item));
        $purchasable = $items->filter(fn (array $line) => $line['warning'] === null);
        $subtotal = (float) $purchasable->sum('line_total');
        $hasIssues = $items->contains(fn (array $line) => $line['warning'] !== null);

        $settings = app(\App\Services\Support\ShopSettings::class);
        $shipping = $settings->shippingFor($subtotal, $items->isEmpty());
        $threshold = (int) $settings->get('free_shipping_threshold');

        return [
            'id' => $cart->id,
            'user_id' => $cart->user_id,
            'items' => $items->all(),
            'summary' => [
                'item_count' => (int) $items->sum('quantity'),
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'free_shipping_threshold' => $threshold > 0 ? $threshold : null,
                'free_shipping_remaining' => $threshold > 0 && ! $items->isEmpty() ? max(0, $threshold - $subtotal) : null,
                'total' => $items->isEmpty() ? 0 : $subtotal + $shipping,
                'has_issues' => $hasIssues,
            ],
        ];
    }

    private function line(CartItem $item): array
    {
        $variant = $item->variant;
        $product = $variant?->product;
        $price = $variant ? (float) $variant->price : 0.0;

        return [
            'id' => $item->id,
            'cart_id' => $item->cart_id,
            'product_variant_id' => $item->product_variant_id,
            'quantity' => $item->quantity,
            'product_name' => $product?->name ?? 'Sản phẩm không còn tồn tại',
            'product_slug' => $product?->slug,
            'variant_name' => $variant?->name,
            'sku' => $variant?->sku,
            'image_url' => $variant?->image_url ?: $product?->thumbnail_url,
            'unit_price' => $price,
            'line_total' => $price * $item->quantity,
            'stock_quantity' => $variant ? max(0, (int) $variant->stock_quantity) : 0,
            'warning' => $this->warning($item),
        ];
    }

    private function warning(CartItem $item): ?string
    {
        $variant = $item->variant;
        if (! $variant || ! $variant->is_active || ! $variant->product || $variant->product->status !== 'published') {
            return self::WARNING_UNAVAILABLE;
        }

        if ($variant->stock_quantity <= 0) {
            return self::WARNING_OUT_OF_STOCK;
        }

        if ($variant->stock_quantity < $item->quantity) {
            return self::WARNING_INSUFFICIENT_STOCK;
        }

        return null;
    }
}
