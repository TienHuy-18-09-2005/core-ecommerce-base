<?php

use App\Http\Controllers\Account\AccountController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Shop\BrandController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\CategoryController;
use App\Http\Controllers\Shop\CouponController;
use App\Http\Controllers\Shop\OrderController;
use App\Http\Controllers\Shop\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Pha 4: Sanctum SPA cookie auth (gọi /sanctum/csrf-cookie trước)
Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

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

Route::prefix('admin')->middleware(['auth:sanctum', 'can:admin', 'throttle:admin'])->group(function () {
    Route::post('/products', [AdminProductController::class, 'store']);
    Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus'])
        ->middleware('can:update,order');
});
