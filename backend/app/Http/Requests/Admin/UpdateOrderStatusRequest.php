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
            'cancel_reason' => ['required_if:status,cancelled', 'nullable', 'string', 'min:3', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return ['cancel_reason.required_if' => 'Vui lòng nhập lý do hủy đơn.', 'cancel_reason.min' => 'Lý do hủy cần ít nhất :min ký tự.'];
    }
}
