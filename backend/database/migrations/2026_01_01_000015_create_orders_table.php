<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->unique();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('coupon_id')
                ->nullable()
                ->constrained('coupons')
                ->nullOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone', 20);
            $table->string('customer_email')->nullable();
            $table->string('shipping_province', 100);
            $table->string('shipping_district', 100);
            $table->string('shipping_ward', 100);
            $table->string('shipping_address', 500);
            $table->decimal('subtotal', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('shipping_fee', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2);
            $table->enum('payment_method', ['cod', 'vnpay', 'momo', 'vietqr'])->default('cod');
            $table->enum('payment_status', ['unpaid', 'paid', 'refunded', 'failed'])->default('unpaid');
            $table->enum('status', [
                'pending',
                'confirmed',
                'packing',
                'shipping',
                'delivered',
                'cancelled',
                'returned',
            ])->default('pending');
            $table->text('customer_note')->nullable();
            $table->text('admin_note')->nullable();
            $table->text('cancel_reason')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status', 'created_at'], 'idx_orders_user_status_created');
            $table->index(['status', 'payment_status', 'created_at'], 'idx_orders_admin_filter');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
