<?php

namespace App\Console\Commands;

use App\Services\Shop\CartService;
use Illuminate\Console\Command;

class PruneGuestCarts extends Command
{
    protected $signature = 'carts:prune-guests {--days= : Số ngày không hoạt động (mặc định theo config shop)}';

    protected $description = 'Xoá giỏ hàng khách (chưa đăng nhập) đã hết hạn';

    public function handle(CartService $cartService): int
    {
        $days = (int) ($this->option('days') ?: config('shop.guest_cart_ttl_days'));
        $deleted = $cartService->pruneGuestCarts(max(1, $days));
        $this->info("Đã xoá {$deleted} giỏ khách hết hạn.");

        return self::SUCCESS;
    }
}
