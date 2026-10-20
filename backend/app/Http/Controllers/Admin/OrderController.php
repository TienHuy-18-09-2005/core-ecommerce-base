<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\AdminOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    protected AdminOrderService $orderService;

    public function __construct(AdminOrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        try {
            $request->validate(['status' => 'required|in:pending,confirmed,packing,shipping,delivered,cancelled,returned']);
            $order = $this->orderService->updateOrderStatus($id, $request->input('status'), $request->input('admin_note'));

            return response()->json([
                'success' => true,
                'message' => 'Cập nhật trạng thái đơn hàng thành công!',
                'data' => $order
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
