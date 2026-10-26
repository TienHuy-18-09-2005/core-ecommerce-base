<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class CouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => strtoupper(trim($this->input('code')))]);
        }
    }

    public function rules(): array
    {
        $id = $this->route('coupon')?->id;

        return [
            'code' => ['required', 'string', 'min:3', 'max:50', 'regex:/^[A-Z0-9_-]+$/', Rule::unique('coupons', 'code')->ignore($id)],
            'type' => ['required', 'in:fixed,percent'],
            'value' => ['required', 'numeric', 'gt:0', Rule::when($this->input('type') === 'percent', ['max:100'])],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'gt:0'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'per_customer_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $v) {
            $coupon = $this->route('coupon');
            $limit = $this->input('usage_limit');
            if ($coupon && $limit !== null && (int) $limit < $coupon->used_count) {
                $v->errors()->add('usage_limit', "Giới hạn không được nhỏ hơn số lượt đã dùng ({$coupon->used_count}).");
            }
        }];
    }

    public function messages(): array
    {
        return [
            'code.regex' => 'Mã chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.',
            'code.unique' => 'Mã giảm giá đã tồn tại.',
            'value.max' => 'Giảm theo % tối đa 100.',
            'expires_at.after' => 'Ngày hết hạn phải sau ngày bắt đầu.',
        ];
    }

    public function attributes(): array
    {
        return ['code' => 'mã', 'type' => 'loại', 'value' => 'giá trị', 'usage_limit' => 'giới hạn lượt dùng', 'expires_at' => 'ngày hết hạn', 'starts_at' => 'ngày bắt đầu'];
    }
}
