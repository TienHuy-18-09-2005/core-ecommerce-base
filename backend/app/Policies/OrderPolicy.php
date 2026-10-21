<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Support\Facades\Gate;

class OrderPolicy
{
    /** Chỉ chủ đơn mới xem được qua /api/user/orders/{code}; người khác nhận 404 (không lộ đơn tồn tại). */
    public function view(User $user, Order $order): Response
    {
        return $order->user_id !== null && $order->user_id === $user->id
            ? Response::allow()
            : Response::denyAsNotFound('Không tìm thấy dữ liệu.');
    }

    public function update(User $user, Order $order): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
