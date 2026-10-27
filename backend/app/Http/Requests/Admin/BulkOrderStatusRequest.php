<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BulkOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'min:1'],
            'status' => ['required', 'in:confirmed,packing,shipping,delivered,cancelled,returned'],
            'cancel_reason' => ['required_if:status,cancelled', 'nullable', 'string', 'min:3', 'max:255'],
            'admin_note' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'ids.required' => 'Chưa chọn đơn nào.',
            'ids.max' => 'Mỗi lần chỉ xử lý tối đa :max đơn.',
            'cancel_reason.required_if' => 'Vui lòng nhập lý do hủy đơn.',
            'cancel_reason.min' => 'Lý do hủy cần ít nhất :min ký tự.',
        ];
    }
}
