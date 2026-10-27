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
        $q = $this->filtered(Order::query()->withCount('items'), $f);
        if (! empty($f['status'])) {
            $q->where('status', $f['status']);
        }

        return \App\Support\AdminSort::apply($q, $f, ['id' => 'id', 'order_code' => 'order_code', 'customer_name' => 'customer_name', 'total_amount' => 'total_amount', 'status' => 'status', 'created_at' => 'created_at'])->paginate($f['per_page'] ?? 20);
    }

    /** Đếm theo trạng thái cho tab — áp các lọc khác (tìm, thanh toán, ngày) trừ chính trạng thái. */
    public function statusCounts(array $f): array
    {
        $rows = $this->filtered(Order::query(), $f)->selectRaw('status, COUNT(*) as c')->groupBy('status')->pluck('c', 'status');
        $out = ['all' => (int) $rows->sum()];
        foreach (array_keys(self::STATUS_LABELS) as $st) {
            $out[$st] = (int) ($rows[$st] ?? 0);
        }

        return $out;
    }

    /** Cho polling thông báo đơn mới: id lớn nhất, số đơn mới hơn `since`, số đơn chờ xác nhận (badge). */
    public function latest(?int $since): array
    {
        $latest = (int) Order::max('id');

        return [
            'latest_id' => $latest,
            'new_count' => $since !== null ? Order::where('id', '>', $since)->count() : 0,
            'pending_count' => Order::where('status', 'pending')->count(),
        ];
    }

    private function filtered($q, array $f)
    {
        if (! empty($f['payment_method'])) {
            $q->where('payment_method', $f['payment_method']);
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

        return $q;
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
        $order->load('items', 'coupon:id,code', 'statusHistories.user:id,name', 'notes.user:id,name');
        $history = $order->statusHistories;
        if ($history->isEmpty()) {
            // Đơn rất cũ chưa có lịch sử: hiển thị tối thiểu mốc đặt hàng
            $history = collect([(new \App\Models\OrderStatusHistory(['from_status' => null, 'to_status' => 'pending', 'backfilled' => true]))
                ->forceFill(['created_at' => $order->created_at])]);
        }

        return $this->presenter->full($order) + [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'coupon_code' => $order->coupon?->code,
            'admin_note' => $order->admin_note,
            'cancel_reason' => $order->cancel_reason,
            'allowed_transitions' => self::TRANSITIONS[$order->status] ?? [],
            'timeline' => $history->map(fn ($h) => [
                'type' => $h->from_status === null ? 'created' : 'status_changed',
                'status' => $h->to_status,
                'from' => $h->from_status,
                'label' => $h->from_status === null ? 'Đặt hàng' : (self::STATUS_LABELS[$h->to_status] ?? $h->to_status),
                'by' => $h->user?->name,
                'note' => $h->note,
                'backfilled' => (bool) $h->backfilled,
                'at' => $h->created_at?->toIso8601String(),
            ])->values()->all(),
            'notes' => $order->notes->map(fn ($n) => $this->noteArray($n))->values()->all(),
        ];
    }

    public function noteArray(\App\Models\OrderNote $n): array
    {
        return ['id' => $n->id, 'body' => $n->body, 'by' => $n->user?->name, 'at' => $n->created_at?->toIso8601String()];
    }

    public function addNote(Order $order, string $body): \App\Models\OrderNote
    {
        return DB::transaction(function () use ($order, $body) {
            $note = $order->notes()->create(['user_id' => request()?->user()?->id, 'body' => $body]);
            $this->audit->record('order.note_added', $order, ['note_id' => $note->id, 'length' => mb_strlen($body)]);

            return $note->load('user:id,name');
        });
    }

    /**
     * Đổi trạng thái hàng loạt: mỗi đơn xử lý trong transaction riêng, lỗi đơn này không ảnh hưởng đơn khác.
     * Trả kết quả từng đơn (ok + lý do khi thất bại).
     */
    public function bulkStatus(array $ids, string $status, ?string $cancelReason, ?string $note): array
    {
        $codes = Order::whereIn('id', $ids)->pluck('order_code', 'id');
        $results = [];
        foreach (array_values(array_unique($ids)) as $id) {
            if (! isset($codes[$id])) {
                $results[] = ['id' => $id, 'order_code' => null, 'ok' => false, 'message' => 'Không tìm thấy đơn.'];
                continue;
            }
            try {
                $this->updateOrderStatus($id, $status, $note, $cancelReason);
                $results[] = ['id' => $id, 'order_code' => $codes[$id], 'ok' => true, 'message' => null];
            } catch (DomainException $e) {
                $results[] = ['id' => $id, 'order_code' => $codes[$id], 'ok' => false, 'message' => $e->getMessage()];
            }
        }
        $ok = count(array_filter($results, fn ($r) => $r['ok']));

        return ['results' => $results, 'succeeded' => $ok, 'failed' => count($results) - $ok];
    }

    /** Dữ liệu phiếu giao hàng cho 1..n đơn (giữ thứ tự yêu cầu). */
    public function printData(array $ids): array
    {
        $orders = Order::with('items', 'coupon:id,code')->whereIn('id', $ids)->get()->keyBy('id');

        return [
            'store' => StoreInfo::get(),
            'orders' => collect($ids)->unique()->filter(fn ($id) => $orders->has($id))
                ->map(fn ($id) => $this->presenter->full($orders[$id]) + [
                    'id' => $orders[$id]->id,
                    'coupon_code' => $orders[$id]->coupon?->code,
                    'cod_amount' => $orders[$id]->payment_method === 'cod' && $orders[$id]->payment_status !== 'paid' ? (float) $orders[$id]->total_amount : 0.0,
                ])->values()->all(),
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

            $order->statusHistories()->create([
                'from_status' => $old, 'to_status' => $newStatus, 'user_id' => request()?->user()?->id,
                'note' => $newStatus === 'cancelled' ? ($cancelReason ?: $adminNote ?: null) : ($adminNote ?: null),
            ]);

            $this->audit->record('order.status_changed', $order, array_filter([
                'from' => $old, 'to' => $newStatus, 'note' => $adminNote ?: null, 'cancel_reason' => $cancelReason ?: null,
            ]));

            return $order;
        });
    }
}
