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
        // Vào khu quản trị: admin đang hoạt động, hoặc nhân viên có ít nhất một quyền.
        Gate::define('admin', fn (User $user): bool => $user->permissions() !== []);
        // Mỗi quyền R6 là một ability: can:revenue.view, Gate::allows('orders.cancel')...
        foreach (\App\Support\Permissions::all() as $permission) {
            Gate::define($permission, fn (User $user): bool => $user->hasPermission($permission));
        }
        // Sửa được cài đặt thì cũng xem được.
        Gate::define('settings.view', fn (User $user): bool => $user->hasPermission('settings.view') || $user->hasPermission('settings.manage'));

        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        RateLimiter::for('account', function (Request $request) {
            return Limit::perMinute(60)->by($this->clientKey($request));
        });

        // Đổi mật khẩu cần mật khẩu cũ → chống dò bằng giới hạn chặt
        RateLimiter::for('password-change', function (Request $request) {
            return Limit::perMinute(5)->by($this->clientKey($request));
        });

        // Quên mật khẩu / đặt lại: 5/phút theo email + IP (§2.3.3)
        RateLimiter::for('forgot-password', function (Request $request) {
            $email = strtolower((string) $request->input('email'));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        // Gửi lại email xác thực: 3/phút theo user
        RateLimiter::for('verification-resend', function (Request $request) {
            return Limit::perMinute(3)->by($this->clientKey($request));
        });

        RateLimiter::for('verify-email', function (Request $request) {
            return Limit::perMinute(10)->by((string) $request->ip());
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->ip());
        });

        RateLimiter::for('checkout', function (Request $request) {
            return Limit::perMinute(10)->by($this->cartClientKey($request));
        });

        RateLimiter::for('coupon-check', function (Request $request) {
            return Limit::perMinute(10)->by($this->cartClientKey($request));
        });

        RateLimiter::for('order-lookup', function (Request $request) {
            return Limit::perMinute(5)->by((string) $request->ip());
        });

        RateLimiter::for('cart', function (Request $request) {
            return Limit::perMinute(60)->by($this->cartClientKey($request));
        });

        RateLimiter::for('public-read', function (Request $request) {
            return Limit::perMinute(120)->by((string) $request->ip());
        });

        // Gợi ý tìm kiếm: FE debounce 300ms nên 60/phút/IP là đủ cho người gõ thật
        RateLimiter::for('search-suggest', function (Request $request) {
            return Limit::perMinute(60)->by((string) $request->ip());
        });

        // Viết/sửa/xóa đánh giá: 5/phút và 20/ngày theo user (chống spam)
        RateLimiter::for('review-write', function (Request $request) {
            $key = $this->clientKey($request);

            return [
                Limit::perMinute(5)->by('min:'.$key),
                Limit::perDay(20)->by('day:'.$key),
            ];
        });

        RateLimiter::for('admin', function (Request $request) {
            return Limit::perMinute(60)->by($this->clientKey($request));
        });

        RateLimiter::for('admin-upload', function (Request $request) {
            return Limit::perMinute(20)->by($this->clientKey($request));
        });
    }

    private function clientKey(Request $request): string
    {
        $userId = $request->user()?->id;

        return $userId ? 'user:'.$userId : 'ip:'.$request->ip();
    }

    /** User hoặc (cart token + IP) — §2.3.3. Token được băm, không dùng giá trị thô làm khoá. */
    private function cartClientKey(Request $request): string
    {
        $userId = $request->user('sanctum')?->id;
        if ($userId) {
            return 'user:'.$userId;
        }

        $token = $request->cookie('cart_token');
        $cart = is_string($token) && $token !== '' ? substr(hash('sha256', $token), 0, 16) : 'none';

        return 'cart:'.$cart.'|ip:'.$request->ip();
    }
}
