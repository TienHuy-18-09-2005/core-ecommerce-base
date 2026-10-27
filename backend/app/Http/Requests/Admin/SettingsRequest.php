<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $trim = fn ($v) => is_string($v) ? trim($v) : $v;
        $this->merge(array_map($trim, $this->only(['store_name', 'store_phone', 'store_address'])));
        if ($this->input('free_shipping_threshold') === '') {
            $this->merge(['free_shipping_threshold' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'store_name' => ['sometimes', 'required', 'string', 'max:150'],
            'store_phone' => ['sometimes', 'required', 'string', 'max:20', 'regex:/^[0-9 +().-]{8,20}$/'],
            'store_address' => ['sometimes', 'required', 'string', 'max:500'],
            'shipping_fee' => ['sometimes', 'required', 'integer', 'min:0', 'max:10000000'],
            'free_shipping_threshold' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000000'],
        ];
    }

    public function messages(): array
    {
        return [
            'store_phone.regex' => 'Số điện thoại không hợp lệ.',
        ];
    }

    public function attributes(): array
    {
        return [
            'store_name' => 'tên cửa hàng', 'store_phone' => 'số điện thoại', 'store_address' => 'địa chỉ',
            'shipping_fee' => 'phí vận chuyển', 'free_shipping_threshold' => 'ngưỡng miễn phí vận chuyển',
        ];
    }
}
