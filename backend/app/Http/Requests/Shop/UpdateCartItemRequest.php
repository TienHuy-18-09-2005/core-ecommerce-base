<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // 0 = xoá dòng khỏi giỏ
        return [
            'quantity' => ['required', 'integer', 'min:0', 'max:999'],
        ];
    }
}
