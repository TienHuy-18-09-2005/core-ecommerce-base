<?php

namespace App\Services\Shop;

use App\Exceptions\DomainException;
use App\Models\Coupon;
use App\Models\Order;

/**
 * Mỗi lý do từ chối có code riêng (tiền tố COUPON_) và thông báo tiếng Việt cho khách.
 * /coupons/check vẫn bị throttle 10/phút để hạn chế dò mã.
 */
class CouponService
{
    public const NOT_FOUND = 'COUPON_NOT_FOUND';

    public const NOT_STARTED = 'COUPON_NOT_STARTED';

    public const EXPIRED = 'COUPON_EXPIRED';

    public const USAGE_LIMIT_REACHED = 'COUPON_USAGE_LIMIT_REACHED';

    public const CUSTOMER_LIMIT_REACHED = 'COUPON_CUSTOMER_LIMIT_REACHED';

    public const MIN_ORDER_NOT_MET = 'COUPON_MIN_ORDER_NOT_MET';

    public function find(string $code, bool $lock = false): Coupon
    {
        $query = Coupon::query()->where('code', trim($code));
        if ($lock) {
            $query->lockForUpdate();
        }

        $coupon = $query->first();
        if (! $coupon || ! $coupon->is_active) {
            throw $this->reject(self::NOT_FOUND, 'Mã giảm giá không tồn tại.');
        }

        if ($coupon->starts_at !== null && $coupon->starts_at->isFuture()) {
            throw $this->reject(self::NOT_STARTED, 'Mã giảm giá chưa đến thời gian áp dụng (từ '.$coupon->starts_at->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i').').');
        }

        if ($coupon->expires_at !== null && $coupon->expires_at->isPast()) {
            throw $this->reject(self::EXPIRED, 'Mã giảm giá đã hết hạn.');
        }

        return $coupon;
    }

    /** Trả về số tiền giảm (đã kẹp trong [0, subtotal]) hoặc ném lỗi COUPON_*. */
    public function discountFor(Coupon $coupon, float $subtotal, ?int $userId, ?string $phone): float
    {
        if ($coupon->usage_limit !== null && $coupon->used_count >= $coupon->usage_limit) {
            throw $this->reject(self::USAGE_LIMIT_REACHED, 'Mã giảm giá đã hết lượt sử dụng.');
        }

        $min = (float) $coupon->min_order_amount;
        if ($subtotal <= 0 || $subtotal < $min) {
            throw $this->reject(self::MIN_ORDER_NOT_MET, 'Đơn hàng chưa đạt giá trị tối thiểu '.self::vnd($min).' để dùng mã này.');
        }

        if ($coupon->per_customer_limit !== null && $this->usedByCustomer($coupon, $userId, $phone) >= $coupon->per_customer_limit) {
            throw $this->reject(self::CUSTOMER_LIMIT_REACHED, 'Bạn đã dùng hết số lần cho phép của mã giảm giá này.');
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

    public static function vnd(float $amount): string
    {
        return number_format($amount, 0, ',', '.').'đ';
    }

    private function reject(string $code, string $message): DomainException
    {
        return new DomainException($code, $message, 422);
    }
}
