<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Support\Permissions;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/** Tra quyền hiệu lực của user, cache theo khóa perm:user:{id} (Redis ở môi trường chạy thật). */
class PermissionService
{
    public const TTL = 3600;

    public static function key(int $userId): string
    {
        return 'perm:user:'.$userId;
    }

    /** @return list<string> */
    public function for(User $user): array
    {
        if (! $user->is_active) {
            return [];
        }
        if ($user->role === 'admin') {
            return Permissions::all();
        }
        if ($user->role !== 'staff') {
            return [];
        }

        return Cache::remember(self::key($user->id), self::TTL, fn () => DB::table('user_role')
            ->join('role_permission', 'role_permission.role_id', '=', 'user_role.role_id')
            ->join('permissions', 'permissions.id', '=', 'role_permission.permission_id')
            ->where('user_role.user_id', $user->id)
            ->whereNotIn('permissions.key', Permissions::ADMIN_ONLY)
            ->distinct()->orderBy('permissions.key')->pluck('permissions.key')->all());
    }

    public function has(User $user, string $permission): bool
    {
        return in_array($permission, $this->for($user), true);
    }

    public function forget(int ...$userIds): void
    {
        foreach ($userIds as $id) {
            Cache::forget(self::key($id));
        }
    }

    /** Xóa cache của mọi user đang mang vai trò này. */
    public function forgetRole(int $roleId): void
    {
        $this->forget(...DB::table('user_role')->where('role_id', $roleId)->pluck('user_id')->map(fn ($v) => (int) $v)->all());
    }
}
