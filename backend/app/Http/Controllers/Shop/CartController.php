<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shop\AddToCartRequest;
use App\Http\Requests\Shop\UpdateCartItemRequest;
use App\Services\Shop\CartPresenter;
use App\Services\Shop\CartService;
use App\Services\Shop\GuestCartToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    public function __construct(
        protected CartService $cartService,
        protected GuestCartToken $cartToken,
        protected CartPresenter $presenter,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);
        $cart = $this->cartService->getCart($owner->userId, $this->cartToken->storageKey($owner));

        return $this->cartToken->attach(
            response()->json(['success' => true, 'data' => $this->presenter->present($cart)]),
            $owner
        );
    }

    public function store(AddToCartRequest $request): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);
        $cart = $this->cartService->addToCart(
            $owner->userId,
            $this->cartToken->storageKey($owner),
            (int) $request->validated('product_variant_id'),
            (int) $request->validated('quantity')
        );

        return $this->cartToken->attach(
            response()->json([
                'success' => true,
                'message' => 'Đã thêm vào giỏ hàng',
                'data' => $this->presenter->present($cart),
            ]),
            $owner
        );
    }

    public function update(UpdateCartItemRequest $request, int $itemId): JsonResponse
    {
        $owner = $this->cartToken->resolve($request);
        $cart = $this->cartService->updateItemQuantity(
            $owner->userId,
            $this->cartToken->storageKey($owner),
            $itemId,
            (int) $request->validated('quantity')
        );

        return $this->cartToken->attach(
            response()->json([
                'success' => true,
                'message' => 'Đã cập nhật giỏ hàng',
                'data' => $this->presenter->present($cart),
            ]),
            $owner
        );
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
                'data' => $this->presenter->present($cart),
            ]),
            $owner
        );
    }
}
