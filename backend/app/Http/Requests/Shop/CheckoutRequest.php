<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:255'],
            'customer_phone' => ['required', 'string', 'max:20'],
            'customer_email' => ['nullable', 'email', 'max:255'],
            'shipping_province' => ['required', 'string', 'max:100'],
            'shipping_district' => ['required', 'string', 'max:100'],
            'shipping_ward' => ['required', 'string', 'max:100'],
            'shipping_address' => ['required', 'string', 'max:500'],
            'payment_method' => ['required', 'in:cod,vnpay,momo,vietqr'],
            'customer_note' => ['nullable', 'string'],
            'coupon_code' => ['nullable', 'string', 'exists:coupons,code'],
        ];
    }
}
