<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\CheckCouponRequest;
use App\Services\Shop\GuestCartToken;
use App\Services\Shop\OrderService;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function __construct(
        protected OrderService $orderService,
        protected GuestCartToken $cartToken,
    ) {}

    /** Chỉ xem trước; số tiền chính thức được tính lại khi đặt hàng. */
    public function check(CheckCouponRequest $request): JsonResponse
    {
        $owner = $this->cartToken->resolve($request, issueIfMissing: false);
        $preview = $this->orderService->previewCoupon(
            $request->validated('code'),
            $owner->userId,
            $this->cartToken->storageKey($owner),
        );

        return response()->json(['success' => true, 'data' => $preview]);
    }
}
