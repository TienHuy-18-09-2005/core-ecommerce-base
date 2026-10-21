<?php

namespace App\Services\Shop;

use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Repositories\Contracts\CartRepositoryInterface;
use Illuminate\Support\Facades\DB;

class CartService
{
    public function __construct(protected CartRepositoryInterface $cartRepository) {}

    public function getCart(?int $userId, ?string $sessionId): Cart
    {
        return $this->cartRepository->findOrCreateCart($userId, $sessionId);
    }

    public function addToCart(?int $userId, ?string $sessionId, int $variantId, int $quantity): Cart
    {
        return DB::transaction(function () use ($userId, $sessionId, $variantId, $quantity) {
            $cart = $this->cartRepository->findOrCreateCart($userId, $sessionId);
            $variant = $this->purchasableVariant($variantId);

            $cartItem = CartItem::where('cart_id', $cart->id)
                ->where('product_variant_id', $variantId)
                ->lockForUpdate()
                ->first();

            $newQty = ($cartItem?->quantity ?? 0) + $quantity;
            if ($variant->stock_quantity < $newQty) {
                throw new DomainException(
                    DomainException::STOCK_UNAVAILABLE,
                    "Chỉ còn {$variant->stock_quantity} sản phẩm trong kho.",
                    422
                );
            }

            if ($cartItem) {
                $cartItem->update(['quantity' => $newQty]);
            } else {
                CartItem::create([
                    'cart_id' => $cart->id,
                    'product_variant_id' => $variantId,
                    'quantity' => $quantity,
                ]);
            }

            $cart->touch();

            return $this->cartRepository->findOrCreateCart($userId, $sessionId);
        });
    }

    public function updateItemQuantity(?int $userId, ?string $sessionId, int $itemId, int $quantity): Cart
    {
        return DB::transaction(function () use ($userId, $sessionId, $itemId, $quantity) {
            $cart = $this->cartRepository->findOrCreateCart($userId, $sessionId);
            $cartItem = CartItem::where('cart_id', $cart->id)->where('id', $itemId)->firstOrFail();

            if ($quantity <= 0) {
                $cartItem->delete();
            } else {
                // Cho phép giảm số lượng kể cả khi biến thể đã ngừng bán; tăng thì phải còn hàng
                $variant = $cartItem->variant;
                if ($quantity > $cartItem->quantity && (! $variant || ! $variant->is_active || $variant->stock_quantity < $quantity)) {
                    throw new DomainException(
                        DomainException::STOCK_UNAVAILABLE,
                        'Số lượng trong kho không đủ.',
                        422
                    );
                }
                $cartItem->update(['quantity' => $quantity]);
            }

            $cart->touch();

            return $this->cartRepository->findOrCreateCart($userId, $sessionId);
        });
    }

    public function removeItem(?int $userId, ?string $sessionId, int $itemId): Cart
    {
        $cart = $this->cartRepository->findOrCreateCart($userId, $sessionId);
        CartItem::where('cart_id', $cart->id)->where('id', $itemId)->delete();
        $cart->touch();

        return $this->cartRepository->findOrCreateCart($userId, $sessionId);
    }

    /**
     * Gộp giỏ khách vào giỏ tài khoản (gọi sau session()->regenerate() khi đăng nhập — Pha 4).
     * Khoá biến thể, kẹp số lượng ≤ tồn kho, bỏ biến thể ngừng bán.
     *
     * @return array{cart: Cart, adjustments: list<array{product_variant_id:int, requested:int, quantity:int, reason:string}>}
     */
    public function mergeGuestCartToUser(string $plainToken, int $userId): array
    {
        $sessionId = hash('sha256', $plainToken);

        $adjustments = DB::transaction(function () use ($sessionId, $userId) {
            $guestCart = Cart::where('session_id', $sessionId)->whereNull('user_id')->lockForUpdate()->first();
            if (! $guestCart) {
                return [];
            }

            $userCart = $this->cartRepository->findOrCreateCart($userId, null);
            Cart::whereKey($userCart->id)->lockForUpdate()->first();

            $guestItems = CartItem::where('cart_id', $guestCart->id)->orderBy('product_variant_id')->get();
            $variants = ProductVariant::with('product')
                ->whereIn('id', $guestItems->pluck('product_variant_id'))
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $adjustments = [];
            foreach ($guestItems as $item) {
                $variant = $variants->get($item->product_variant_id);
                $userItem = CartItem::where('cart_id', $userCart->id)
                    ->where('product_variant_id', $item->product_variant_id)
                    ->first();
                $requested = ($userItem?->quantity ?? 0) + $item->quantity;

                if (! $variant || ! $variant->is_active || $variant->product?->status !== 'published') {
                    $adjustments[] = ['product_variant_id' => $item->product_variant_id, 'requested' => $item->quantity, 'quantity' => 0, 'reason' => CartPresenter::WARNING_UNAVAILABLE];

                    continue;
                }

                $quantity = min($requested, max(0, (int) $variant->stock_quantity));
                if ($quantity < $requested) {
                    $adjustments[] = ['product_variant_id' => $variant->id, 'requested' => $requested, 'quantity' => $quantity, 'reason' => CartPresenter::WARNING_INSUFFICIENT_STOCK];
                }

                if ($quantity <= 0) {
                    $userItem?->delete();

                    continue;
                }

                if ($userItem) {
                    $userItem->update(['quantity' => $quantity]);
                } else {
                    CartItem::create(['cart_id' => $userCart->id, 'product_variant_id' => $variant->id, 'quantity' => $quantity]);
                }
            }

            CartItem::where('cart_id', $guestCart->id)->delete();
            $guestCart->delete();

            return $adjustments;
        });

        return [
            'cart' => $this->cartRepository->findOrCreateCart($userId, null),
            'adjustments' => $adjustments,
        ];
    }

    /** Xoá giỏ khách không hoạt động quá $days ngày. Trả về số giỏ đã xoá. */
    public function pruneGuestCarts(int $days): int
    {
        $ids = Cart::whereNull('user_id')->where('updated_at', '<', now()->subDays($days))->pluck('id');
        if ($ids->isEmpty()) {
            return 0;
        }

        CartItem::whereIn('cart_id', $ids)->delete();

        return Cart::whereIn('id', $ids)->delete();
    }

    private function purchasableVariant(int $variantId): ProductVariant
    {
        $variant = ProductVariant::with('product')->find($variantId);
        if (! $variant || ! $variant->is_active || $variant->product?->status !== 'published') {
            throw new DomainException(
                DomainException::PRODUCT_UNAVAILABLE,
                'Sản phẩm hiện không khả dụng.',
                422
            );
        }

        return $variant;
    }
}
