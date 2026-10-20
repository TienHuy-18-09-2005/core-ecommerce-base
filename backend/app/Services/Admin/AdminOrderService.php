<?php

namespace App\Services\Admin;

use App\Models\Order;
use Illuminate\Support\Facades\DB;

class AdminOrderService
{
    public function updateOrderStatus(int $orderId, string $newStatus, ?string $adminNote = null)
    {
        return DB::transaction(function () use ($orderId, $newStatus, $adminNote) {
            $order = Order::with('items.variant')->findOrFail($orderId);
            $oldStatus = $order->status;

            // Nếu trạng thái mới là 'cancelled' và trạng thái cũ chưa phải cancelled -> Hoàn lại tồn kho cho biến thể SKU
            if ($newStatus === 'cancelled' && $oldStatus !== 'cancelled') {
                foreach ($order->items as $item) {
                    if ($item->variant) {
                        $item->variant->increment('stock_quantity', $item->quantity);
                    }
                }
                $order->cancelled_at = now();
            }

            if ($newStatus === 'confirmed' && !$order->confirmed_at) {
                $order->confirmed_at = now();
            }

            if ($newStatus === 'delivered' && !$order->delivered_at) {
                $order->delivered_at = now();
                $order->payment_status = 'paid'; // Đã thanh toán khi giao hàng thành công
            }

            $order->status = $newStatus;
            if ($adminNote) {
                $order->admin_note = $adminNote;
            }
            $order->save();

            return $order;
        });
    }
}
