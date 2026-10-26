<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Shop\BrandController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\CategoryController;
use App\Http\Controllers\Shop\CouponController;
use App\Http\Controllers\Shop\OrderController;
use App\Http\Controllers\Shop\ProductController;
use App\Http\Controllers\Shop\ReviewController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Pha 4: Sanctum SPA cookie auth (gọi /sanctum/csrf-cookie trước)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:forgot-password');
    Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:forgot-password');
});

// Xác thực email: link ký tương đối (SPA gọi lại), gửi lại giới hạn 3/phút
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->whereNumber('id')
    ->middleware(['signed:relative', 'throttle:verify-email'])
    ->name('verification.verify');
Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware(['auth:sanctum', 'throttle:verification-resend']);

Route::middleware(['auth:sanctum', 'throttle:account'])->prefix('user')->group(function () {
    Route::get('/', [AccountController::class, 'me']);
    Route::put('/profile', [AccountController::class, 'updateProfile']);
    Route::put('/password', [AccountController::class, 'changePassword'])->middleware('throttle:password-change');
    Route::get('/orders', [AccountController::class, 'orders']);
    Route::get('/addresses', [AccountController::class, 'addresses']);
    Route::post('/addresses', [AccountController::class, 'storeAddress']);
    Route::put('/addresses/{id}', [AccountController::class, 'updateAddress'])->whereNumber('id');
    Route::delete('/addresses/{id}', [AccountController::class, 'destroyAddress'])->whereNumber('id');
});

Route::middleware('throttle:public-read')->group(function () {
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/suggest', [ProductController::class, 'suggest'])
        ->middleware('throttle:search-suggest');
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/products/{slug}/reviews', [ReviewController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/brands', [BrandController::class, 'index']);
});

Route::middleware('throttle:cart')->group(function () {
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::put('/cart/{itemId}', [CartController::class, 'update'])->whereNumber('itemId');
    Route::delete('/cart/{itemId}', [CartController::class, 'destroy'])->whereNumber('itemId');
});

Route::post('/checkout', [OrderController::class, 'store'])->middleware('throttle:checkout');
Route::post('/coupons/check', [CouponController::class, 'check'])->middleware('throttle:coupon-check');
Route::post('/orders/lookup', [OrderController::class, 'lookup'])->middleware('throttle:order-lookup');

Route::get('/user/orders/{order:order_code}', [OrderController::class, 'showMine'])
    ->middleware(['auth:sanctum', 'throttle:public-read', 'can:view,order']);

// Pha 5: đánh giá. Chỉ người mua đã nhận hàng + email đã xác thực (xem ReviewService)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/products/{slug}/reviews/eligibility', [ReviewController::class, 'eligibility'])
        ->middleware('throttle:account');
    Route::middleware('throttle:review-write')->group(function () {
        Route::post('/products/{slug}/reviews', [ReviewController::class, 'store']);
        // Multipart không gửi được bằng PUT trong PHP → FE gửi POST kèm _method=PUT
        Route::put('/reviews/{review}', [ReviewController::class, 'update']);
        Route::delete('/reviews/{review}', [ReviewController::class, 'destroy']);
    });
});

// Mọi route admin: đăng nhập + Gate admin + throttle; thêm policy theo từng tài nguyên.
Route::prefix('admin')->middleware(['auth:sanctum', 'can:admin', 'throttle:admin'])->group(function () {
    Route::get('/dashboard', AdminDashboardController::class);

    Route::get('/products', [AdminProductController::class, 'index'])->middleware('can:viewAny,App\Models\Product');
    Route::post('/products', [AdminProductController::class, 'store'])->middleware('can:create,App\Models\Product');
    Route::post('/products/images', [AdminProductController::class, 'uploadImage'])
        ->middleware(['can:create,App\Models\Product', 'throttle:admin-upload']);
    Route::get('/products/{product}', [AdminProductController::class, 'show'])->middleware('can:view,product');
    Route::put('/products/{product}', [AdminProductController::class, 'update'])->middleware('can:update,product');
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy'])->middleware('can:delete,product');

    Route::get('/categories', [AdminCategoryController::class, 'index'])->middleware('can:viewAny,App\Models\Category');
    Route::post('/categories', [AdminCategoryController::class, 'store'])->middleware('can:create,App\Models\Category');
    Route::put('/categories/{category}', [AdminCategoryController::class, 'update'])->middleware('can:update,category');
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy'])->middleware('can:delete,category');

    Route::get('/coupons', [AdminCouponController::class, 'index'])->middleware('can:viewAny,App\Models\Coupon');
    Route::post('/coupons', [AdminCouponController::class, 'store'])->middleware('can:create,App\Models\Coupon');
    Route::put('/coupons/{coupon}', [AdminCouponController::class, 'update'])->middleware('can:update,coupon');
    Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy'])->middleware('can:delete,coupon');

    Route::get('/orders', [AdminOrderController::class, 'index'])->middleware('can:viewAny,App\Models\Order');
    Route::get('/orders/{order}', [AdminOrderController::class, 'show'])->middleware('can:manage,order');
    Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus'])
        ->middleware('can:update,order');

    Route::get('/reviews', [AdminReviewController::class, 'index'])->middleware('can:viewAny,App\Models\ProductReview');
    Route::patch('/reviews/{review}', [AdminReviewController::class, 'moderate'])->middleware('can:moderate,review');
    Route::delete('/reviews/{review}', [AdminReviewController::class, 'destroy'])->middleware('can:moderate,review');
});
