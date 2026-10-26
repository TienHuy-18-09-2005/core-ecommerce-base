<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

/** Quản trị Category: chỉ admin đang hoạt động (Gate 'admin'). */
class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function view(User $user, Category $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function create(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function update(User $user, Category $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function delete(User $user, Category $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
