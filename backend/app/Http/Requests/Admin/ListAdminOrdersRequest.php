<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ListAdminOrdersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['nullable', 'in:pending,confirmed,packing,shipping,delivered,cancelled,returned'],
            'payment_status' => ['nullable', 'in:unpaid,paid,refunded,failed'],
            'payment_method' => ['nullable', 'in:cod,vnpay,momo,vietqr'],
            'q' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
            ...\App\Support\AdminSort::rules(['id', 'order_code', 'customer_name', 'total_amount', 'status', 'created_at']),
            'page' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ];
    }

    public function messages(): array
    {
        return \App\Support\AdminSort::messages();
    }
}
