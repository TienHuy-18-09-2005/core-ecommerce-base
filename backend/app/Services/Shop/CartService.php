<?php

namespace App\Services\Shop;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Repositories\Contracts\CartRepositoryInterface;
use Illuminate\Support\Facades\DB;

class CartService
{
    protected CartRepositoryInterface $cartRepository;

    public function __construct(CartRepositoryInterface $cartRepository)
    {
        $this->cartRepository = $cartRepository;
    }

    public function getCart(?int $userId, ?string $sessionId)
    {
        return $this->cartRepository->findOrCreateCart($userId, $sessionId);
    }

    public function addToCart(?int $userId, ?string $sessionId, int $variantId, int $quantity)
    {
        return DB::transaction(function () use ($userId, $sessionId, $variantId, $quantity) {
            $cart = $this->cartRepository->findOrCreateCart($userId, $sessionId);

            // Kiểm tra tồn kho biến thể SKU
            $variant = ProductVariant::findOrFail($variantId);
            if ($variant->stock_quantity < $quantity) {
                throw new \Exception('Số lượng sản phẩm trong kho không đủ.');
            }

            // Tìm xem item đã có trong giỏ hàng chưa
            $cartItem = CartItem::where('cart_id', $cart->id)
                ->where('product_variant_id', $variantId)
                ->first();

            if ($cartItem) {
                $newQty = $cartItem->quantity + $quantity;
                if ($variant->stock_quantity < $newQty) {
                    throw new \Exception('Tổng số lượng vượt quá tồn kho cho phép.');
                }
                $cartItem->update(['quantity' => $newQty]);
            } else {
                CartItem::create([
                    'cart_id' => $cart->id,
                    'product_variant_id' => $variantId,
                    'quantity' => $quantity,
                ]);
            }

            return $this->cartRepository->findOrCreateCart($userId, $sessionId);
        });
    }

    public function updateItemQuantity(?int $userId, ?string $sessionId, int $itemId, int $quantity)
    {
        return DB::transaction(function () use ($userId, $sessionId, $itemId, $quantity) {
            $cart = $this->cartRepository->findOrCreateCart($userId, $sessionId);
            $cartItem = CartItem::where('cart_id', $cart->id)->where('id', $itemId)->firstOrFail();

            if ($quantity <= 0) {
                $cartItem->delete();
            } else {
                $variant = $cartItem->variant;
                if ($variant->stock_quantity < $quantity) {
                    throw new \Exception('Số lượng trong kho không đủ.');
                }
                $cartItem->update(['quantity' => $quantity]);
            }

            return $this->cartRepository->findOrCreateCart($userId, $sessionId);
        });
    }

    public function removeItem(?int $userId, ?string $sessionId, int $itemId)
    {
        $cart = $this->cartRepository->findOrCreateCart($userId, $sessionId);
        CartItem::where('cart_id', $cart->id)->where('id', $itemId)->delete();

        return $this->cartRepository->findOrCreateCart($userId, $sessionId);
    }

    /**
     * Gộp giỏ khách vào giỏ tài khoản. $plainToken là cart_token thô (chưa băm).
     * Luồng đăng nhập chưa gọi hàm này.
     */
    public function mergeGuestCartToUser(string $plainToken, int $userId)
    {
        $sessionId = hash('sha256', $plainToken);

        DB::transaction(function () use ($sessionId, $userId) {
            $guestCart = CartItem::whereHas('cart', function ($q) use ($sessionId) {
                $q->where('session_id', $sessionId);
            })->get();

            if ($guestCart->isEmpty()) {
                return;
            }

            $userCart = $this->cartRepository->findOrCreateCart($userId, null);

            foreach ($guestCart as $item) {
                $userItem = CartItem::where('cart_id', $userCart->id)
                    ->where('product_variant_id', $item->product_variant_id)
                    ->first();

                if ($userItem) {
                    $userItem->update(['quantity' => $userItem->quantity + $item->quantity]);
                } else {
                    $item->update(['cart_id' => $userCart->id]);
                }
            }

            // Xóa giỏ hàng session cũ
            Cart::where('session_id', $sessionId)->delete();
        });
    }
}
