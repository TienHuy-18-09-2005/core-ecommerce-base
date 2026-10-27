<?php

namespace App\Policies;

use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProductReviewPolicy
{
    /** Chỉ chủ đánh giá được sửa; người khác nhận 404 để không lộ đánh giá chưa duyệt. */
    public function update(User $user, ProductReview $review): Response
    {
        return $review->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound('Không tìm thấy dữ liệu.');
    }

    /** Chủ đánh giá hoặc admin được xóa. */
    public function delete(User $user, ProductReview $review): Response
    {
        return $review->user_id === $user->id || $user->hasPermission('reviews.moderate')
            ? Response::allow()
            : Response::denyAsNotFound('Không tìm thấy dữ liệu.');
    }

    public function viewAny(User $user): bool
    {
        return $user->hasPermission('reviews.view');
    }

    public function moderate(User $user, ProductReview $review): bool
    {
        return $user->hasPermission('reviews.moderate');
    }
}
