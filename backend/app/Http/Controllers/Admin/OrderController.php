<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Services\Admin\AdminOrderService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    protected AdminOrderService $orderService;

    public function __construct(AdminOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $data = $request->validated();
        $order = $this->orderService->updateOrderStatus(
            $order->id,
            $data['status'],
            $data['admin_note'] ?? null
        );

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái đơn hàng thành công!',
            'data' => $order,
        ]);
    }
}
