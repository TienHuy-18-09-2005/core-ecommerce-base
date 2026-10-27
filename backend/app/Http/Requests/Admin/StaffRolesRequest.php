<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StaffRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => [$this->isMethod('post') ? 'required' : 'prohibited', 'email', 'max:255'],
            'role_ids' => ['present', 'array'],
            'role_ids.*' => ['integer', 'distinct', 'exists:roles,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'Email là bắt buộc.',
            'email.email' => 'Email không hợp lệ.',
            'role_ids.present' => 'Danh sách vai trò là bắt buộc.',
            'role_ids.*.exists' => 'Vai trò không tồn tại.',
        ];
    }
}
