<?php

namespace App\Services\Shop;

use App\Exceptions\DomainException;
use App\Models\Coupon;
use App\Models\Order;

/**
 * Mọi lý do từ chối (không tồn tại, hết hạn, hết lượt, chưa đủ giá trị đơn...)
 * trả về cùng 1 lỗi COUPON_INVALID để không lộ thông tin mã nào có thật.
 */
class CouponService
{
    public const INVALID_MESSAGE = 'Mã giảm giá không hợp lệ hoặc không áp dụng được cho đơn hàng này.';

    public function find(string $code, bool $lock = false): Coupon
    {
        $query = Coupon::query()->where('code', trim($code))->active();
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->first() ?? throw $this->invalid();
    }

    /** Trả về số tiền giảm (đã kẹp trong [0, subtotal]) hoặc ném COUPON_INVALID. */
    public function discountFor(Coupon $coupon, float $subtotal, ?int $userId, ?string $phone): float
    {
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw $this->invalid();
        }

        if ($subtotal <= 0 || $subtotal < (float) $coupon->min_order_amount) {
            throw $this->invalid();
        }

        if ($coupon->per_customer_limit !== null && $this->usedByCustomer($coupon, $userId, $phone) >= $coupon->per_customer_limit) {
            throw $this->invalid();
        }

        $discount = $coupon->type === 'percent'
            ? $subtotal * (float) $coupon->value / 100
            : (float) $coupon->value;

        if ($coupon->max_discount_amount !== null) {
            $discount = min($discount, (float) $coupon->max_discount_amount);
        }

        return round(max(0, min($discount, $subtotal)));
    }

    private function usedByCustomer(Coupon $coupon, ?int $userId, ?string $phone): int
    {
        if ($userId === null && $phone === null) {
            return 0;
        }

        return Order::query()
            ->where('coupon_id', $coupon->id)
            ->where('status', '!=', 'cancelled')
            ->where(function ($q) use ($userId, $phone) {
                if ($userId !== null) {
                    $q->orWhere('user_id', $userId);
                }
                if ($phone !== null) {
                    $q->orWhere('customer_phone', $phone);
                }
            })
            ->count();
    }

    private function invalid(): DomainException
    {
        return new DomainException(DomainException::COUPON_INVALID, self::INVALID_MESSAGE, 422);
    }
}
