<?php

namespace App\Http\Requests\Shop;

use Illuminate\Foundation\Http\FormRequest;

class OrderLookupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'order_code' => ['required', 'string', 'max:50'],
            'phone' => ['required', 'string', 'max:20'],
        ];
    }
}
