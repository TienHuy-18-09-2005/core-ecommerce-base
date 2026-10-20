<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Shop\ProductController;
use App\Http\Controllers\Shop\CartController;
use App\Http\Controllers\Shop\OrderController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{slug}', [ProductController::class, 'show']);
Route::get('/cart', [CartController::class, 'index']);
Route::post('/cart', [CartController::class, 'store']);
Route::put('/cart/{itemId}', [CartController::class, 'update']);
Route::delete('/cart/{itemId}', [CartController::class, 'destroy']);
Route::post('/checkout', [OrderController::class, 'store']);
Route::post('/products', [AdminProductController::class, 'store']);
Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
