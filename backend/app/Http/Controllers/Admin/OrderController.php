<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAdminOrdersRequest;
use App\Http\Requests\Admin\UpdateOrderStatusRequest;
use App\Models\Order;
use App\Services\Admin\AdminOrderService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function __construct(private AdminOrderService $orderService) {}

    public function index(ListAdminOrdersRequest $request): JsonResponse
    {
        return $this->paginated($this->orderService->list($request->validated()), fn ($o) => $this->orderService->summary($o));
    }

    public function show(Order $order): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->orderService->detail($order)]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $data = $request->validated();
        $order = $this->orderService->updateOrderStatus($order->id, $data['status'], $data['admin_note'] ?? null, $data['cancel_reason'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật trạng thái đơn hàng thành công!',
            'data' => $this->orderService->detail($order),
        ]);
    }
}
