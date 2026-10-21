<?php

namespace App\DTOs\Order;

use App\Support\VietnamesePhone;

readonly class CreateOrderDTO
{
    public function __construct(
        public ?int $userId,
        public string $idempotencyKey,
        public string $customerName,
        public string $customerPhone,
        public ?string $customerEmail,
        public string $shippingProvince,
        public string $shippingDistrict,
        public string $shippingWard,
        public string $shippingAddress,
        public string $paymentMethod,
        public ?string $customerNote,
        public ?string $couponCode
    ) {}

    /** Chỉ đọc từ $validated (FormRequest), không đọc input thô. */
    public static function fromValidated(array $data, ?int $userId): self
    {
        $coupon = isset($data['coupon_code']) ? trim((string) $data['coupon_code']) : '';

        return new self(
            userId: $userId,
            idempotencyKey: $data['idempotency_key'],
            customerName: $data['customer_name'],
            customerPhone: VietnamesePhone::normalize($data['customer_phone']),
            customerEmail: $data['customer_email'] ?? null,
            shippingProvince: $data['shipping_province'],
            shippingDistrict: $data['shipping_district'],
            shippingWard: $data['shipping_ward'],
            shippingAddress: $data['shipping_address'],
            paymentMethod: $data['payment_method'],
            customerNote: $data['customer_note'] ?? null,
            couponCode: $coupon === '' ? null : $coupon,
        );
    }
}
