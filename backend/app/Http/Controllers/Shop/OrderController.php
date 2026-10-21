<?php

namespace App\Http\Controllers\Shop;

use App\DTOs\Order\CreateOrderDTO;
use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\CheckoutRequest;
use App\Http\Requests\Shop\OrderLookupRequest;
use App\Models\Order;
use App\Services\Shop\GuestCartToken;
use App\Services\Shop\OrderPresenter;
use App\Services\Shop\OrderService;
use Illuminate\Http\JsonResponse;

class OrderController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
        protected GuestCartToken $cartToken,
        protected OrderPresenter $presenter,
    ) {}

    public function store(CheckoutRequest $request): JsonResponse
    {
        $owner = $this->cartToken->resolve($request, issueIfMissing: false);

        // Chính sách: khách (không đăng nhập) vẫn đặt hàng được; tài khoản đã đăng nhập
        // phải xác thực email trước khi đặt hàng bằng tài khoản.
        $user = $request->user('sanctum');
        if ($user && ! $user->hasVerifiedEmail()) {
            throw new DomainException(
                DomainException::EMAIL_NOT_VERIFIED,
                'Vui lòng xác thực email trước khi đặt hàng bằng tài khoản.',
                403
            );
        }

        $dto = CreateOrderDTO::fromValidated($request->validated(), $owner->userId);
        $result = $this->orderService->createOrder($dto, $this->cartToken->storageKey($owner));

        return response()->json([
            'success' => true,
            'message' => 'Đặt hàng thành công!',
            'data' => $this->presenter->full($result['order']),
            'meta' => ['replayed' => $result['replayed']],
        ], $result['replayed'] ? 200 : 201);
    }

    public function lookup(OrderLookupRequest $request): JsonResponse
    {
        $data = $request->validated();
        $order = $this->orderService->lookup($data['order_code'], $data['phone']);

        return response()->json(['success' => true, 'data' => $this->presenter->masked($order)]);
    }

    /** Route: auth:sanctum + can:view,order (OrderPolicy). */
    public function showMine(Order $order): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->presenter->full($order)]);
    }
}
