<?php

namespace App\Policies;

use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class ProductReviewPolicy
{
    /** Chỉ chủ đánh giá được sửa; người khác nhận 404 để không lộ đánh giá chưa duyệt. */
    public function update(User $user, ProductReview $review): Response
    {
        return $review->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound('Không tìm thấy dữ liệu.');
    }

    /** Chủ đánh giá hoặc admin được xoá. */
    public function delete(User $user, ProductReview $review): Response
    {
        return $review->user_id === $user->id || Gate::forUser($user)->allows('admin')
            ? Response::allow()
            : Response::denyAsNotFound('Không tìm thấy dữ liệu.');
    }

    public function viewAny(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }

    public function moderate(User $user, ProductReview $review): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
