<?php

namespace App\Services\Shop;

use App\DTOs\Order\CreateOrderDTO;
use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Support\VietnamesePhone;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(protected CouponService $coupons) {}

    /**
     * Tạo đơn an toàn: idempotent theo (scope, key), khoá cart rồi variant theo id tăng dần,
     * khoá coupon trước khi tăng used_count. Server tự tính mọi số tiền.
     *
     * @return array{order: Order, replayed: bool}
     */
    public function createOrder(CreateOrderDTO $dto, ?string $sessionId): array
    {
        $scope = $this->scope($dto->userId, $sessionId);
        if ($scope === null) {
            throw new DomainException(DomainException::CART_EMPTY, 'Giỏ hàng trống, không thể đặt hàng.', 422);
        }

        if ($existing = $this->findByIdempotency($scope, $dto->idempotencyKey)) {
            return ['order' => $existing, 'replayed' => true];
        }

        try {
            $order = DB::transaction(fn () => $this->placeOrder($dto, $sessionId, $scope));
        } catch (UniqueConstraintViolationException $e) {
            // Request song song cùng key: request kia đã tạo đơn trước
            $existing = $this->findByIdempotency($scope, $dto->idempotencyKey);
            if (! $existing) {
                throw $e;
            }

            return ['order' => $existing, 'replayed' => true];
        }

        return $order instanceof Order
            ? ['order' => $order, 'replayed' => false]
            : ['order' => $order['replayed'], 'replayed' => true];
    }

    private function placeOrder(CreateOrderDTO $dto, ?string $sessionId, string $scope): Order|array
    {
        $cart = Cart::query()
            ->when($dto->userId !== null,
                fn ($q) => $q->where('user_id', $dto->userId),
                fn ($q) => $q->whereNull('user_id')->where('session_id', $sessionId))
            ->lockForUpdate()
            ->first();

        if (! $cart) {
            // Có thể request cùng key vừa đặt xong và xoá giỏ
            if ($existing = $this->findByIdempotency($scope, $dto->idempotencyKey)) {
                return ['replayed' => $existing];
            }
            throw new DomainException(DomainException::CART_EMPTY, 'Giỏ hàng trống, không thể đặt hàng.', 422);
        }

        $items = $cart->items()->orderBy('product_variant_id')->get();
        if ($items->isEmpty()) {
            throw new DomainException(DomainException::CART_EMPTY, 'Giỏ hàng trống, không thể đặt hàng.', 422);
        }

        // Khoá variant theo id tăng dần để tránh deadlock giữa các đơn song song
        $variants = ProductVariant::with('product')
            ->whereIn('id', $items->pluck('product_variant_id')->unique()->sort()->values())
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $subtotal = 0.0;
        $orderItems = [];
        foreach ($items as $item) {
            $variant = $variants->get($item->product_variant_id);

            if (! $variant || ! $variant->is_active || $variant->product?->status !== 'published') {
                throw new DomainException(
                    DomainException::PRODUCT_UNAVAILABLE,
                    'Một số sản phẩm trong giỏ đã ngừng bán. Vui lòng cập nhật giỏ hàng.',
                    409
                );
            }

            if ($variant->stock_quantity < $item->quantity) {
                throw new DomainException(
                    DomainException::STOCK_UNAVAILABLE,
                    "Sản phẩm {$variant->product->name} ({$variant->name}) chỉ còn lại {$variant->stock_quantity} trong kho.",
                    409
                );
            }

            $lineTotal = (float) $variant->price * $item->quantity;
            $subtotal += $lineTotal;
            $orderItems[] = [
                'product_id' => $variant->product_id,
                'product_variant_id' => $variant->id,
                'product_name' => $variant->product->name,
                'variant_name' => $variant->name,
                'sku' => $variant->sku,
                'thumbnail_url' => $variant->image_url ?: $variant->product->thumbnail_url,
                'unit_price' => $variant->price,
                'quantity' => $item->quantity,
                'line_total' => $lineTotal,
            ];
        }

        $discount = 0.0;
        $couponId = null;
        if ($dto->couponCode !== null) {
            $coupon = $this->coupons->find($dto->couponCode, lock: true);
            $discount = $this->coupons->discountFor($coupon, $subtotal, $dto->userId, $dto->customerPhone);
            $couponId = $coupon->id;
            $coupon->increment('used_count');
        }

        $shippingFee = (float) config('shop.shipping_fee');

        $order = Order::create([
            'order_code' => $this->newOrderCode(),
            'idempotency_key' => $dto->idempotencyKey,
            'idempotency_scope' => $scope,
            'user_id' => $dto->userId,
            'coupon_id' => $couponId,
            'customer_name' => $dto->customerName,
            'customer_phone' => $dto->customerPhone,
            'customer_email' => $dto->customerEmail,
            'shipping_province' => $dto->shippingProvince,
            'shipping_district' => $dto->shippingDistrict,
            'shipping_ward' => $dto->shippingWard,
            'shipping_address' => $dto->shippingAddress,
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'shipping_fee' => $shippingFee,
            'total_amount' => max(0, $subtotal - $discount) + $shippingFee,
            'payment_method' => $dto->paymentMethod,
            'payment_status' => 'unpaid',
            'status' => 'pending',
            'customer_note' => $dto->customerNote,
        ]);

        foreach ($orderItems as $data) {
            $order->items()->create($data);
            $variants->get($data['product_variant_id'])->decrement('stock_quantity', $data['quantity']);
        }

        $cart->items()->delete();
        $cart->delete();

        return $order->load('items');
    }

    /** Xem trước coupon trên giỏ hiện tại (không khoá, không tăng used_count). */
    public function previewCoupon(string $code, ?int $userId, ?string $sessionId): array
    {
        $cart = $this->ownedCart($userId, $sessionId);
        $summary = $cart ? app(CartPresenter::class)->present($cart)['summary'] : null;
        $subtotal = (float) ($summary['subtotal'] ?? 0);

        $coupon = $this->coupons->find($code);
        $discount = $this->coupons->discountFor($coupon, $subtotal, $userId, null);
        $shipping = (float) config('shop.shipping_fee');

        return [
            'code' => $coupon->code,
            'subtotal' => $subtotal,
            'discount_amount' => $discount,
            'shipping_fee' => $shipping,
            'total' => max(0, $subtotal - $discount) + $shipping,
        ];
    }

    /** Tra cứu đơn khách: phải khớp cả mã đơn và SĐT; lỗi chung khi không khớp. */
    public function lookup(string $orderCode, string $phone): Order
    {
        $order = Order::with('items')
            ->where('order_code', trim($orderCode))
            ->where('customer_phone', VietnamesePhone::normalize($phone))
            ->first();

        return $order ?? throw new DomainException(
            DomainException::ORDER_NOT_FOUND,
            'Không tìm thấy đơn hàng khớp với thông tin đã nhập.',
            404
        );
    }

    private function ownedCart(?int $userId, ?string $sessionId): ?Cart
    {
        if ($userId !== null) {
            return Cart::where('user_id', $userId)->first();
        }

        return $sessionId ? Cart::whereNull('user_id')->where('session_id', $sessionId)->first() : null;
    }

    private function scope(?int $userId, ?string $sessionId): ?string
    {
        if ($userId !== null) {
            return 'user:'.$userId;
        }

        return $sessionId ? 'cart:'.$sessionId : null;
    }

    private function findByIdempotency(string $scope, string $key): ?Order
    {
        return Order::with('items')
            ->where('idempotency_scope', $scope)
            ->where('idempotency_key', $key)
            ->first();
    }

    private function newOrderCode(): string
    {
        do {
            $code = 'ORD-'.strtoupper(Str::random(10));
        } while (Order::where('order_code', $code)->exists());

        return $code;
    }
}
