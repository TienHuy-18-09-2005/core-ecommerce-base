<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Services\Shop\CartService;
use App\Http\Requests\Shop\AddToCartRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CartController extends Controller
{
    protected CartService $cartService;

    public function __construct(CartService $cartService)
    {
        $this->cartService = $cartService;
    }

    private function getIdentifier(Request $request): array
    {
        $user = $request->user('sanctum');
        $userId = $user ? $user->id : null;
        $sessionId = $request->header('X-Session-ID') ?: $request->input('session_id');

        return [$userId, $sessionId];
    }

    public function index(Request $request): JsonResponse
    {
        [$userId, $sessionId] = $this->getIdentifier($request);
        $cart = $this->cartService->getCart($userId, $sessionId);

        return response()->json(['success' => true, 'data' => $cart]);
    }

    public function store(AddToCartRequest $request): JsonResponse
    {
        try {
            [$userId, $sessionId] = $this->getIdentifier($request);
            $cart = $this->cartService->addTocart(
                $userId,
                $sessionId,
                $request->input('product_variant_id'),
                $request->input('quantity')
            );

            return response()->json(['success' => true, 'message' => 'Đã thêm vào giỏ hàng', 'data' => $cart]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function update(Request $request, int $itemId): JsonResponse
    {
        try {
            [$userId, $sessionId] = $this->getIdentifier($request);
            $cart = $this->cartService->updateItemQuantity(
                $userId,
                $sessionId,
                $itemId,
                $request->input('quantity', 1)
            );

            return response()->json(['success' => true, 'message' => 'Đã cập nhật giỏ hàng', 'data' => $cart]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }

    public function destroy(Request $request, int $itemId): JsonResponse
    {
        [$userId, $sessionId] = $this->getIdentifier($request);
        $cart = $this->cartService->removeItem($userId, $sessionId, $itemId);

        return response()->json(['success' => true, 'message' => 'Đã xóa sản phẩm khỏi giỏ hàng', 'data' => $cart]);
    }
}
