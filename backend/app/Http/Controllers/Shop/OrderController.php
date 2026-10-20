<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Services\Shop\OrderService;
use App\DTOs\Order\CreateOrderDTO;
use App\Http\Requests\Shop\CheckoutRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function store(CheckoutRequest $request): JsonResponse
    {
        try {
            $user = $request->user('sanctum');
            $userId = $user ? $user->id : null;
            $sessionId = $request->header('X-Session-ID');

            $dto = CreateOrderDTO::fromRequest($request, $userId);
            $order = $this->orderService->createOrder($dto, $sessionId);

            return response()->json([
                'success' => true,
                'message' => 'Đặt hàng thành công!',
                'data' => $order
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }
}
