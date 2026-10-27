<?php

namespace App\Support;

use App\Models\User;

class UserPresenter
{
    /** Chỉ trường công khai cho SPA. */
    public static function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role,
            'avatar_url' => $user->avatar_url,
            'email_verified' => $user->hasVerifiedEmail(),
            // R6: quyền hiệu lực (admin = tất cả; nhân viên = hợp quyền các vai trò; khách = rỗng)
            'permissions' => in_array($user->role, ['admin', 'staff'], true) ? $user->permissions() : [],
        ];
    }
}
