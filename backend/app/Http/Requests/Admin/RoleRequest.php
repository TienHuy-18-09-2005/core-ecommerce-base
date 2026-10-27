<?php

namespace App\Http\Requests\Admin;

use App\Support\Permissions;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('role')?->id;

        return [
            'name' => ['required', 'string', 'max:100', Rule::unique('roles', 'name')->ignore($id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            // roles.manage / settings.manage chỉ dành cho admin: không gán được cho vai trò
            'permissions.*' => ['string', 'distinct', Rule::in(Permissions::assignable())],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Tên vai trò là bắt buộc.',
            'name.unique' => 'Tên vai trò đã tồn tại.',
            'name.max' => 'Tên vai trò tối đa 100 ký tự.',
            'permissions.present' => 'Danh sách quyền là bắt buộc.',
            'permissions.*.in' => 'Quyền không hợp lệ hoặc chỉ dành cho admin.',
        ];
    }
}
