<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

/** Quản trị Category: theo quyền R6 (admin có mọi quyền). */
class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('categories.view');
    }

    public function view(User $user, Category $model): bool
    {
        return $user->hasPermission('categories.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('categories.manage');
    }

    public function update(User $user, Category $model): bool
    {
        return $user->hasPermission('categories.manage');
    }

    public function delete(User $user, Category $model): bool
    {
        return $user->hasPermission('categories.manage');
    }
}
