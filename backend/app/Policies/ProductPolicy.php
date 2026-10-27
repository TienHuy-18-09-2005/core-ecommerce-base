<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

/**
 * Quản trị Product. Hiện tại mọi quyền = admin đang hoạt động (Gate 'admin');
 * R6 chỉ cần thay can() để tra quyền products.view / products.edit / products.delete theo vai trò.
 */
class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->can($user, 'products.view');
    }

    public function view(User $user, Product $model): bool
    {
        return $this->can($user, 'products.view');
    }

    public function create(User $user): bool
    {
        return $this->can($user, 'products.edit');
    }

    public function update(User $user, Product $model): bool
    {
        return $this->can($user, 'products.edit');
    }

    /** Thao tác hàng loạt (ẩn/hiện, gán danh mục) trên nhiều sản phẩm. */
    public function updateAny(User $user): bool
    {
        return $this->can($user, 'products.edit');
    }

    public function delete(User $user, Product $model): bool
    {
        return $this->can($user, 'products.delete');
    }

    /** Điểm cắm R6: ánh xạ quyền chi tiết. */
    private function can(User $user, string $permission): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
