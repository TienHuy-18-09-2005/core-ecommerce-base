<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

/** Quản trị Product: chỉ admin đang hoạt động (Gate 'admin'). */
class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function view(User $user, Product $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function create(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function update(User $user, Product $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function delete(User $user, Product $model): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
