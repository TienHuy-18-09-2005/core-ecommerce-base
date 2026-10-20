<?php

namespace App\Repositories\Contracts;

use App\Models\Cart;

interface CartRepositoryInterface extends BaseRepositoryInterface
{
    public function getCartByUserOrSession(?int $userId, ?string $sessionId): ?Cart;
    public function findOrCreateCart(?int $userId, ?string $sessionId): Cart;
}
