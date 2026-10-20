<?php

namespace App\Repositories\Eloquent;

use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Repositories\Contracts\CartRepositoryInterface;

class CartRepository extends BaseRepository implements CartRepositoryInterface
{
    public function __construct(Cart $model)
    {
        parent::__construct($model);
    }

    public function getCartByUserOrSession(?int $userId, ?string $sessionId): ?Cart
    {
        $query = $this->model->with(['items.variant.product', 'items.variant.attributeValues.attribute']);

        if ($userId) {
            return $query->where('user_id', $userId)->first();
        }

        if ($sessionId) {
            return $query->where('session_id', $sessionId)->first();
        }

        return null;
    }

    public function findOrCreateCart(?int $userId, ?string $sessionId): Cart
    {
        if ($userId === null && ($sessionId === null || $sessionId === '')) {
            throw new DomainException(
                DomainException::CART_OWNER_REQUIRED,
                'Không thể tạo giỏ hàng khi thiếu định danh chủ sở hữu.'
            );
        }

        $cart = $this->getCartByUserOrSession($userId, $sessionId);

        if (! $cart) {
            $cart = $this->model->create([
                'user_id' => $userId,
                'session_id' => $sessionId,
            ]);
        }

        return $cart->load(['items.variant.product']);
    }
}
