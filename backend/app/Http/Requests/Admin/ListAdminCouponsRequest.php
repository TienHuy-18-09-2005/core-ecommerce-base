<?php

namespace App\Http\Requests\Admin;

use App\Support\AdminSort;
use Illuminate\Foundation\Http\FormRequest;

class ListAdminCouponsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:50'],
            ...AdminSort::rules(['id', 'code', 'value', 'used_count', 'expires_at', 'is_active']),
            'page' => ['nullable', 'integer', 'min:1', 'max:10000'],
        ];
    }

    public function messages(): array
    {
        return AdminSort::messages();
    }
}
