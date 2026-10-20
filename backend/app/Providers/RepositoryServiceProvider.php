<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Repositories\Contracts\BaseRepositoryInterface;
use App\Repositories\Eloquent\BaseRepository;
use App\Repositories\Contracts\ProductRepositoryInterface;
use App\Repositories\Eloquent\ProductRepository;
use App\Repositories\Contracts\CartRepositoryInterface;
use App\Repositories\Eloquent\CartRepository;
use App\Repositories\Contracts\OrderRepositoryInterface;
use App\Repositories\Eloquent\OrderRepository;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind Base Repository
        $this->app->bind(BaseRepositoryInterface::class, BaseRepository::class);
        $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
        $this->app->bind(CartRepositoryInterface::class, CartRepository::class);
        $this->app->bind(OrderRepositoryInterface::class, OrderRepository::class);

        // Sau này khi tạo các Repository cụ thể cho Product, Order,... ta sẽ đăng ký tiếp ở đây
        // VD: $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
    }

    public function boot(): void
    {
        //
    }
}
