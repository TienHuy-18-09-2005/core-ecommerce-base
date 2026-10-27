<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/** Đổi mật khẩu tài khoản quản trị: mạnh hơn tài khoản khách (≥ 10 ký tự, hoa + thường + số + ký tự đặc biệt). */
class AdminPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'confirmed', 'max:255', 'different:current_password',
                Password::min(10)->mixedCase()->numbers()->symbols()],
        ];
    }

    public function messages(): array
    {
        return [
            'password.confirmed' => 'Mật khẩu xác nhận không khớp.',
            'password.different' => 'Mật khẩu mới phải khác mật khẩu hiện tại.',
        ];
    }

    public function attributes(): array
    {
        return ['current_password' => 'mật khẩu hiện tại', 'password' => 'mật khẩu mới'];
    }
}
