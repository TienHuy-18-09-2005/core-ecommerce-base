<?php

namespace App\Providers;

use App\Models\User;
use App\Repositories\Contracts\CartRepositoryInterface;
use App\Repositories\Contracts\ProductRepositoryInterface;
use App\Repositories\Eloquent\CartRepository;
use App\Repositories\Eloquent\ProductRepository;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(CartRepositoryInterface::class, CartRepository::class);
        $this->app->bind(ProductRepositoryInterface::class, ProductRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('admin', function (User $user): bool {
            return $user->role === 'admin' && (bool) $user->is_active;
        });

        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->ip());
        });

        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(10)->by($this->clientKey($request));
        });

        RateLimiter::for('coupon-check', function (Request $request) {
            return Limit::perMinute(10)->by($this->clientKey($request));
        });

        RateLimiter::for('order-lookup', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->ip());
        });

        RateLimiter::for('cart', function (Request $request) {
            return Limit::perMinute(60)->by($this->clientKey($request));
        });

        RateLimiter::for('public-read', function (Request $request) {
            return Limit::perMinute(120)->by((string) $request->ip());
        });

        // Gợi ý tìm kiếm: FE debounce 300ms nên 60/phút/IP là đủ cho người gõ thật
        RateLimiter::for('search-suggest', function (Request $request) {
            return Limit::perMinute(60)->by((string) $request->ip());
        });

        RateLimiter::for('admin', function (Request $request) {
            return Limit::perMinute(60)->by($this->clientKey($request));
        });
    }

    private function clientKey(Request $request): string
    {
        $userId = $request->user()?->id;

        return $userId ? 'user:'.$userId : 'ip:'.$request->ip();
    }
}
