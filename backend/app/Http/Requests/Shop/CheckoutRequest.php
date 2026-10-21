<?php

namespace App\Http\Requests\Shop;

use App\Support\VietnamesePhone;
use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        // Idempotency-Key đi qua header; đưa vào dữ liệu để validate chung với form
        $this->merge(['idempotency_key' => $this->header('Idempotency-Key')]);
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['required', 'string', 'regex:/\A[A-Za-z0-9\-]{16,64}\z/'],
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20', 'regex:'.VietnamesePhone::PATTERN],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'shipping_province' => ['required', 'string', 'max:100'],
            'shipping_district' => ['required', 'string', 'max:100'],
            'shipping_ward' => ['required', 'string', 'max:100'],
            'shipping_address' => ['required', 'string', 'max:500'],
            // MVP chỉ COD; thanh toán online cần IPN + xác minh chữ ký (pha sau)
            'payment_method' => ['required', 'in:cod'],
            'customer_note' => ['nullable', 'string', 'max:1000'],
            // Không dùng exists:coupons,code để tránh dò mã; kiểm tra ở CouponService
            'coupon_code' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return [
            'idempotency_key.required' => 'Thiếu khoá chống gửi trùng (Idempotency-Key).',
            'idempotency_key.regex' => 'Idempotency-Key không hợp lệ.',
            'customer_phone.regex' => 'Số điện thoại không hợp lệ.',
            'payment_method.in' => 'Hiện chỉ hỗ trợ thanh toán khi nhận hàng (COD).',
        ];
    }
}
