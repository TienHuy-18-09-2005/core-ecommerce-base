<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'in:pending,confirmed,packing,shipping,delivered,cancelled,returned'],
            'admin_note' => ['nullable', 'string', 'max:5000'],
            'cancel_reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
