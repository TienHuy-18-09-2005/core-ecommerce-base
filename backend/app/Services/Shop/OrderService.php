<?php

namespace App\Services\Shop;

use App\DTOs\Order\CreateOrderDTO;
use App\Exceptions\DomainException;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Repositories\Contracts\CartRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    protected CartRepositoryInterface $cartRepository;

    public function __construct(CartRepositoryInterface $cartRepository)
    {
        $this->cartRepository = $cartRepository;
    }

    public function createOrder(CreateOrderDTO $dto, ?string $sessionId)
    {
        return DB::transaction(function () use ($dto, $sessionId) {
            // 1. Lấy giỏ hàng của user hoặc session
            $cart = $this->cartRepository->getCartByUserOrSession($dto->userId, $sessionId);

            if (! $cart || $cart->items->isEmpty()) {
                throw new DomainException(DomainException::CART_EMPTY, 'Giỏ hàng trống, không thể đặt hàng.');
            }

            $subtotal = 0;
            $orderItemsData = [];

            // 2. Kiểm tra tồn kho và khóa dòng dữ liệu chống bán âm (lockForUpdate)
            foreach ($cart->items as $item) {
                $variant = ProductVariant::where('id', $item->product_variant_id)
                    ->lockForUpdate()
                    ->first();

                if (! $variant || ! $variant->is_active) {
                    throw new DomainException(
                        DomainException::PRODUCT_UNAVAILABLE,
                        "Sản phẩm {$item->variant->name} hiện không khả dụng."
                    );
                }

                if ($variant->stock_quantity < $item->quantity) {
                    throw new DomainException(
                        DomainException::STOCK_UNAVAILABLE,
                        "Sản phẩm {$variant->product->name} ({$variant->name}) chỉ còn lại {$variant->stock_quantity} trong kho."
                    );
                }

                $lineTotal = $variant->price * $item->quantity;
                $subtotal += $lineTotal;

                // Chuẩn bị dữ liệu Snapshot
                $orderItemsData[] = [
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

                // Trừ kho thực tế
                $variant->decrement('stock_quantity', $item->quantity);
            }

            // 3. Xử lý mã giảm giá (Coupon) nếu có
            $discountAmount = 0;
            $couponId = null;
            if ($dto->couponCode) {
                $coupon = Coupon::where('code', $dto->couponCode)->active()->first();
                if ($coupon) {
                    if ($subtotal >= $coupon->min_order_amount) {
                        $couponId = $coupon->id;
                        if ($coupon->type === 'percent') {
                            $discountAmount = ($subtotal * $coupon->value) / 100;
                            if ($coupon->max_discount_amount && $discountAmount > $coupon->max_discount_amount) {
                                $discountAmount = $coupon->max_discount_amount;
                            }
                        } else {
                            $discountAmount = $coupon->value;
                        }
                        $coupon->increment('used_count');
                    }
                }
            }

            $shippingFee = 30000; // Phí vận chuyển cố định hoặc tính theo khu vực
            $totalAmount = max(0, $subtotal - $discountAmount) + $shippingFee;

            // 4. Tạo bản ghi Đơn hàng (Orders)
            $order = Order::create([
                'order_code' => 'ORD-'.strtoupper(Str::random(8)),
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
                'discount_amount' => $discountAmount,
                'shipping_fee' => $shippingFee,
                'total_amount' => $totalAmount,
                'payment_method' => $dto->paymentMethod,
                'payment_status' => 'unpaid',
                'status' => 'pending',
                'customer_note' => $dto->customerNote,
            ]);

            // 5. Lưu cứng các mục Snapshot vào order_items
            foreach ($orderItemsData as $itemData) {
                $order->items()->create($itemData);
            }

            // 6. Xóa giỏ hàng sau khi đặt thành công
            $cart->items()->delete();
            $cart->delete();

            return $order->load('items');
        });
    }
}
