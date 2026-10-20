<?php

namespace App\Http\Controllers\Shop;

use App\DTOs\Order\CreateOrderDTO;
use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\CheckoutRequest;
use App\Services\Shop\GuestCartToken;
use App\Services\Shop\OrderService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    protected OrderService $orderService;

    protected GuestCartToken $cartToken;

    public function __construct(OrderService $orderService, GuestCartToken $cartToken)
    {
        $this->orderService = $orderService;
        $this->cartToken = $cartToken;
    }

    public function store(CheckoutRequest $request): JsonResponse
    {
        try {
            $owner = $this->cartToken->resolve($request, issueIfMissing: false);

            $dto = CreateOrderDTO::fromRequest($request, $owner->userId);
            $order = $this->orderService->createOrder($dto, $this->cartToken->storageKey($owner));

            return response()->json([
                'success' => true,
                'message' => 'Đặt hàng thành công!',
                'data' => $order,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
