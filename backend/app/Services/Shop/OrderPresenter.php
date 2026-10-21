<?php

namespace App\Services\Shop;

use App\Models\Order;
use App\Models\OrderItem;
use App\Support\VietnamesePhone;

class OrderPresenter
{
    /** Cho chủ đơn (người vừa đặt hoặc user đã đăng nhập sở hữu đơn). */
    public function full(Order $order): array
    {
        return $this->base($order) + [
            'customer' => [
                'name' => $order->customer_name,
                'phone' => $order->customer_phone,
                'email' => $order->customer_email,
            ],
            'shipping' => [
                'province' => $order->shipping_province,
                'district' => $order->shipping_district,
                'ward' => $order->shipping_ward,
                'address' => $order->shipping_address,
            ],
            'customer_note' => $order->customer_note,
        ];
    }

    /** Cho tra cứu khách: che bớt PII, không trả địa chỉ chi tiết. */
    public function masked(Order $order): array
    {
        return $this->base($order) + [
            'customer' => [
                'name' => $this->maskName($order->customer_name),
                'phone' => VietnamesePhone::mask($order->customer_phone),
                'email' => $order->customer_email ? $this->maskEmail($order->customer_email) : null,
            ],
            'shipping' => [
                'province' => $order->shipping_province,
                'district' => $order->shipping_district,
                'ward' => null,
                'address' => null,
            ],
            'customer_note' => null,
        ];
    }

    private function base(Order $order): array
    {
        $order->loadMissing('items');

        return [
            'order_code' => $order->order_code,
            'status' => $order->status,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'subtotal' => (float) $order->subtotal,
            'discount_amount' => (float) $order->discount_amount,
            'shipping_fee' => (float) $order->shipping_fee,
            'total_amount' => (float) $order->total_amount,
            'created_at' => $order->created_at?->toIso8601String(),
            'items' => $order->items->map(fn (OrderItem $item) => [
                'product_name' => $item->product_name,
                'variant_name' => $item->variant_name,
                'sku' => $item->sku,
                'thumbnail_url' => $item->thumbnail_url,
                'unit_price' => (float) $item->unit_price,
                'quantity' => (int) $item->quantity,
                'line_total' => (float) $item->line_total,
            ])->values()->all(),
        ];
    }

    private function maskName(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [];
        $last = array_pop($parts) ?? '';

        $masked = array_map(fn (string $p) => mb_substr($p, 0, 1).'***', $parts);
        $masked[] = $last;

        return implode(' ', $masked);
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

        return mb_substr($local, 0, 1).'***@'.$domain;
    }
}
