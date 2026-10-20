<?php

namespace App\DTOs\Order;

readonly class CreateOrderDTO
{
    public function __construct(
        public ?int $userId,
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

    public static function fromRequest($request, ?int $userId): self
    {
        return new self(
            userId: $userId,
            customerName: $request->input('customer_name'),
            customerPhone: $request->input('customer_phone'),
            customerEmail: $request->input('customer_email'),
            shippingProvince: $request->input('shipping_province'),
            shippingDistrict: $request->input('shipping_district'),
            shippingWard: $request->input('shipping_ward'),
            shippingAddress: $request->input('shipping_address'),
            paymentMethod: $request->input('payment_method', 'cod'),
            customerNote: $request->input('customer_note'),
            couponCode: $request->input('coupon_code')
        );
    }
}
