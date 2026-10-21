<?php

namespace App\Http\Requests\Account;

use App\Support\VietnamesePhone;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** Không cho đổi email/role/is_active qua endpoint này. */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:'.VietnamesePhone::PATTERN],
        ];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Số điện thoại không hợp lệ.'];
    }
}
