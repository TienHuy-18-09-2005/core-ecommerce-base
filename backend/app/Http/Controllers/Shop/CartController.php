<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\AddToCartRequest;
use App\Services\Shop\CartService;
use App\Services\Shop\GuestCartToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        protected CartService $cartService,
        protected GuestCartToken $cartToken,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);
        $cart = $this->cartService->getCart($owner->userId, $this->cartToken->storageKey($owner));

        return $this->cartToken->attach(
            response()->json(['success' => true, 'data' => $cart]),
            $owner
        );
    }

    public function store(AddToCartRequest $request): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);

        try {
            $cart = $this->cartService->addToCart(
                $owner->userId,
                $this->cartToken->storageKey($owner),
                (int) $request->validated('product_variant_id'),
                (int) $request->validated('quantity')
            );

            $response = response()->json([
                'success' => true,
                'message' => 'Đã thêm vào giỏ hàng',
                'data' => $cart,
            ]);
        } catch (\Exception $e) {
            $response = response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }

        return $this->cartToken->attach($response, $owner);
    }

    public function update(Request $request, int $itemId): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);

        try {
            $cart = $this->cartService->updateItemQuantity(
                $owner->userId,
                $this->cartToken->storageKey($owner),
                $itemId,
                (int) $request->input('quantity', 1)
            );

            $response = response()->json([
                'success' => true,
                'message' => 'Đã cập nhật giỏ hàng',
                'data' => $cart,
            ]);
        } catch (\Exception $e) {
            $response = response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }

        return $this->cartToken->attach($response, $owner);
    }

    public function destroy(Request $request, int $itemId): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);
        $cart = $this->cartService->removeItem(
            $owner->userId,
            $this->cartToken->storageKey($owner),
            $itemId
        );

        return $this->cartToken->attach(
            response()->json([
                'success' => true,
                'message' => 'Đã xóa sản phẩm khỏi giỏ hàng',
                'data' => $cart,
            ]),
            $owner
        );
    }
}
