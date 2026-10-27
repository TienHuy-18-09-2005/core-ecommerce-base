<?php

namespace App\Policies;

use App\Models\Coupon;
use App\Models\User;

/** Quản trị Coupon: theo quyền R6 (admin có mọi quyền). */
class CouponPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('coupons.view');
    }

    public function view(User $user, Coupon $model): bool
    {
        return $user->hasPermission('coupons.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('coupons.manage');
    }

    public function update(User $user, Coupon $model): bool
    {
        return $user->hasPermission('coupons.manage');
    }

    public function delete(User $user, Coupon $model): bool
    {
        return $user->hasPermission('coupons.manage');
    }
}
