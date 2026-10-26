<?php

namespace App\Policies;

use App\Models\Coupon;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

/** Quản trị Coupon: chỉ admin đang hoạt động (Gate 'admin'). */
class CouponPolicy
{
    public function viewAny(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function view(User $user, Coupon $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function create(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function update(User $user, Coupon $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function delete(User $user, Coupon $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
