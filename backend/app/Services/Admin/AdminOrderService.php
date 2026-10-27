<?php

namespace App\Services\Admin;

use App\Exceptions\DomainException;
use App\Models\AdminAuditLog;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Services\Shop\OrderPresenter;
use App\Services\Support\AuditLogger;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class AdminOrderService
{
    /** Luồng trạng thái hợp lệ. cancelled/returned là trạng thái cuối. */
    public const TRANSITIONS = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['packing', 'cancelled'],
        'packing' => ['shipping', 'cancelled'],
        'shipping' => ['delivered', 'returned'],
        'delivered' => ['returned'],
        'cancelled' => [],
        'returned' => [],
    ];

    public const STATUS_LABELS = [
        'pending' => 'Chờ xác nhận',
        'confirmed' => 'Đã xác nhận',
        'packing' => 'Đang đóng gói',
        'shipping' => 'Đang giao',
        'delivered' => 'Đã giao',
        'cancelled' => 'Đã hủy',
        'returned' => 'Đã trả hàng',
    ];

    public function __construct(private AuditLogger $audit, private OrderPresenter $presenter) {}

    public function list(array $f): LengthAwarePaginator
    {
        $q = Order::query()->withCount('items');
        if (! empty($f['status'])) {
            $q->where('status', $f['status']);
        }
        if (! empty($f['payment_status'])) {
            $q->where('payment_status', $f['payment_status']);
        }
        if (! empty($f['q'])) {
            $term = '%'.addcslashes($f['q'], '%_\\').'%';
            $q->where(fn ($w) => $w->where('order_code', 'like', $term)
                ->orWhere('customer_name', 'like', $term)
                ->orWhere('customer_phone', 'like', $term)
                ->orWhere('customer_email', 'like', $term));
        }
        if (! empty($f['from'])) {
            $q->where('created_at', '>=', $f['from'].' 00:00:00');
        }
        if (! empty($f['to'])) {
            $q->where('created_at', '<=', $f['to'].' 23:59:59');
        }

        return \App\Support\AdminSort::apply($q, $f, ['id' => 'id', 'order_code' => 'order_code', 'customer_name' => 'customer_name', 'total_amount' => 'total_amount', 'status' => 'status', 'created_at' => 'created_at'])->paginate($f['per_page'] ?? 20);
    }

    public function summary(Order $order): array
    {
        return [
            'id' => $order->id,
            'order_code' => $order->order_code,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'status' => $order->status,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'total_amount' => (float) $order->total_amount,
            'items_count' => (int) ($order->items_count ?? $order->items()->count()),
            'created_at' => $order->created_at?->toIso8601String(),
        ];
    }

    public function detail(Order $order): array
    {
        $order->load('items', 'coupon:id,code');
        $logs = AdminAuditLog::with('user:id,name')
            ->where('subject_type', 'Order')->where('subject_id', $order->id)
            ->orderBy('id')->get();

        return $this->presenter->full($order) + [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'coupon_code' => $order->coupon?->code,
            'admin_note' => $order->admin_note,
            'cancel_reason' => $order->cancel_reason,
            'allowed_transitions' => self::TRANSITIONS[$order->status] ?? [],
            'timeline' => array_merge(
                [['type' => 'created', 'status' => 'pending', 'label' => 'Đặt hàng', 'by' => null, 'note' => null,
                    'at' => $order->created_at?->toIso8601String()]],
                $logs->map(fn (AdminAuditLog $l) => [
                    'type' => 'status_changed',
                    'status' => $l->changes['to'] ?? null,
                    'label' => self::STATUS_LABELS[$l->changes['to'] ?? ''] ?? ($l->changes['to'] ?? ''),
                    'by' => $l->user?->name,
                    'note' => $l->changes['note'] ?? null,
                    'at' => $l->created_at?->toIso8601String(),
                ])->all(),
            ),
        ];
    }

    /**
     * Đổi trạng thái có khoá: lock đơn → kiểm tra luồng → (hủy) hoàn kho theo thứ tự id biến thể + trả lượt coupon.
     * Hoàn trả (returned) KHÔNG tự cộng kho: hàng trả về cần kiểm tra trước khi nhập lại.
     */
    public function updateOrderStatus(int $orderId, string $newStatus, ?string $adminNote = null, ?string $cancelReason = null): Order
    {
        return DB::transaction(function () use ($orderId, $newStatus, $adminNote, $cancelReason) {
            $order = Order::whereKey($orderId)->lockForUpdate()->firstOrFail();
            $old = $order->status;

            if (! in_array($newStatus, self::TRANSITIONS[$old] ?? [], true)) {
                throw new DomainException(
                    DomainException::INVALID_STATUS_TRANSITION,
                    'Không thể chuyển đơn từ "'.(self::STATUS_LABELS[$old] ?? $old).'" sang "'.(self::STATUS_LABELS[$newStatus] ?? $newStatus).'".',
                    409
                );
            }

            if ($newStatus === 'cancelled') {
                $items = $order->items()->whereNotNull('product_variant_id')->get()
                    ->groupBy('product_variant_id')->map->sum('quantity')->sortKeys();
                // Khoá theo thứ tự id tăng dần giống checkout để tránh deadlock
                ProductVariant::withTrashed()->whereIn('id', $items->keys())->orderBy('id')->lockForUpdate()->get()
                    ->each(fn (ProductVariant $v) => $v->increment('stock_quantity', (int) $items[$v->id]));
                if ($order->coupon_id) {
                    Coupon::whereKey($order->coupon_id)->where('used_count', '>', 0)->lockForUpdate()->first()?->decrement('used_count');
                }
                $order->cancelled_at = now();
                $order->cancel_reason = $cancelReason ?: $order->cancel_reason;
            }
            if ($newStatus === 'confirmed' && ! $order->confirmed_at) {
                $order->confirmed_at = now();
            }
            if ($newStatus === 'delivered' && ! $order->delivered_at) {
                $order->delivered_at = now();
                $order->payment_status = 'paid';
            }

            $order->status = $newStatus;
            if ($adminNote !== null && $adminNote !== '') {
                $order->admin_note = $adminNote;
            }
            $order->save();

            $this->audit->record('order.status_changed', $order, array_filter([
                'from' => $old, 'to' => $newStatus, 'note' => $adminNote ?: null, 'cancel_reason' => $cancelReason ?: null,
            ]));

            return $order;
        });
    }
}
