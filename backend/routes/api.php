<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Admin\RoleController as AdminRoleController;
use App\Http\Controllers\Admin\StaffController as AdminStaffController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\ProductImageController as AdminProductImageController;
use App\Http\Controllers\Shop\BrandController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\CategoryController;
use App\Http\Controllers\Shop\CouponController;
use App\Http\Controllers\Shop\OrderController;
use App\Http\Controllers\Shop\ProductController;
use App\Http\Controllers\Shop\ReviewController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Shop\SettingsController as ShopSettingsController;
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
    Route::get('/settings/public', [ShopSettingsController::class, 'public']);
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
    Route::get('/dashboard', AdminDashboardController::class)->middleware('can:dashboard.view');

    Route::get('/products', [AdminProductController::class, 'index'])->middleware('can:viewAny,App\Models\Product');
    Route::post('/products', [AdminProductController::class, 'store'])->middleware('can:create,App\Models\Product');
    Route::post('/products/bulk', [AdminProductController::class, 'bulk'])->middleware('can:updateAny,App\Models\Product');
    Route::post('/products/description-images', [AdminProductController::class, 'descriptionImage'])
        ->middleware(['can:create,App\Models\Product', 'throttle:admin-upload']);
    Route::post('/products/{product}/duplicate', [AdminProductController::class, 'duplicate'])->middleware('can:create,App\Models\Product');
    Route::get('/products/{product}', [AdminProductController::class, 'show'])->middleware('can:view,product');
    Route::get('/products/{product}/history', [AdminProductController::class, 'history'])->middleware(['can:view,product', 'can:audit.view']);
    Route::put('/products/{product}', [AdminProductController::class, 'update'])->middleware('can:update,product');
    Route::delete('/products/{product}', [AdminProductController::class, 'destroy'])->middleware('can:delete,product');
    // Ảnh sản phẩm: tải từng file (để có tiến độ), sắp thứ tự + ảnh chính, xóa kèm file
    Route::post('/products/{product}/images', [AdminProductImageController::class, 'store'])
        ->middleware(['can:update,product', 'throttle:admin-upload']);
    Route::put('/products/{product}/images/order', [AdminProductImageController::class, 'reorder'])->middleware('can:update,product');
    Route::delete('/products/{product}/images/{media}', [AdminProductImageController::class, 'destroy'])
        ->middleware('can:update,product')->scopeBindings();

    Route::get('/categories', [AdminCategoryController::class, 'index'])->middleware('can:viewAny,App\Models\Category');
    Route::post('/categories', [AdminCategoryController::class, 'store'])->middleware('can:create,App\Models\Category');
    Route::put('/categories/{category}', [AdminCategoryController::class, 'update'])->middleware('can:update,category');
    Route::delete('/categories/{category}', [AdminCategoryController::class, 'destroy'])->middleware('can:delete,category');

    Route::get('/coupons', [AdminCouponController::class, 'index'])->middleware('can:viewAny,App\Models\Coupon');
    Route::post('/coupons', [AdminCouponController::class, 'store'])->middleware('can:create,App\Models\Coupon');
    Route::put('/coupons/{coupon}', [AdminCouponController::class, 'update'])->middleware('can:update,coupon');
    Route::delete('/coupons/{coupon}', [AdminCouponController::class, 'destroy'])->middleware('can:delete,coupon');

    Route::get('/orders', [AdminOrderController::class, 'index'])->middleware('can:viewAny,App\Models\Order');
    // Route tĩnh đặt trước /orders/{order}
    Route::get('/orders/status-counts', [AdminOrderController::class, 'counts'])->middleware('can:viewAny,App\Models\Order');
    Route::get('/orders/latest-id', [AdminOrderController::class, 'latest'])->middleware('can:viewAny,App\Models\Order');
    Route::get('/orders/print', [AdminOrderController::class, 'print'])->middleware('can:print,App\Models\Order');
    Route::post('/orders/bulk-status', [AdminOrderController::class, 'bulkStatus'])->middleware('can:updateAny,App\Models\Order');
    Route::get('/orders/{order}', [AdminOrderController::class, 'show'])->middleware('can:manage,order');
    Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus'])
        ->middleware('can:update,order');
    Route::post('/orders/{order}/notes', [AdminOrderController::class, 'addNote'])->middleware('can:note,order');

    Route::get('/reviews', [AdminReviewController::class, 'index'])->middleware('can:viewAny,App\Models\ProductReview');
    Route::patch('/reviews/{review}', [AdminReviewController::class, 'moderate'])->middleware('can:moderate,review');
    Route::delete('/reviews/{review}', [AdminReviewController::class, 'destroy'])->middleware('can:moderate,review');

    // R7: cài đặt (xem: settings.view hoặc settings.manage; sửa: settings.manage). Đổi mật khẩu: mọi user vào được admin.
    Route::get('/settings', [AdminSettingsController::class, 'show'])->middleware('can:settings.view');
    Route::put('/settings', [AdminSettingsController::class, 'update'])->middleware('can:settings.manage');
    Route::put('/account/password', [AdminSettingsController::class, 'password'])->middleware('throttle:password-change');

    // R6: vai trò & phân quyền, gán vai trò cho nhân viên (chỉ admin: roles.manage)
    Route::middleware('can:roles.manage')->group(function () {
        Route::get('/permissions', [AdminRoleController::class, 'permissions']);
        Route::get('/roles', [AdminRoleController::class, 'index']);
        Route::post('/roles', [AdminRoleController::class, 'store']);
        Route::put('/roles/{role}', [AdminRoleController::class, 'update']);
        Route::delete('/roles/{role}', [AdminRoleController::class, 'destroy']);
        Route::get('/staff', [AdminStaffController::class, 'index']);
        Route::post('/staff', [AdminStaffController::class, 'store']);
        Route::put('/staff/{user}/roles', [AdminStaffController::class, 'updateRoles']);
        Route::delete('/staff/{user}', [AdminStaffController::class, 'destroy']);
    });
});
