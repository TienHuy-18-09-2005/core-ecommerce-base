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

    public function viewAny(User $user): bool
    {
        return $this->can($user, 'orders.view');
    }

    /** Admin xem chi tiết đơn (khác view() của khách). */
    public function manage(User $user, Order $order): bool
    {
        return $this->can($user, 'orders.view');
    }

    /** Đổi trạng thái (trừ hủy) và thêm ghi chú nội bộ. */
    public function update(User $user, Order $order): bool
    {
        return $this->can($user, 'orders.update');
    }

    public function updateAny(User $user): bool
    {
        return $this->can($user, 'orders.update');
    }

    public function cancel(User $user, ?Order $order = null): bool
    {
        return $this->can($user, 'orders.cancel');
    }

    public function print(User $user): bool
    {
        return $this->can($user, 'orders.print');
    }

    /**
     * Điểm cắm RBAC: R6 sẽ thay bằng kiểm tra quyền chi tiết ($user->hasPermission($permission)).
     * Hiện mọi quyền đơn hàng = Gate admin.
     */
    private function can(User $user, string $permission): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
