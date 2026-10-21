<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * idempotency_scope = "user:{id}" hoặc "cart:{hash cart token}".
     * UNIQUE(scope, key): cùng 1 chủ giỏ gửi lại cùng key chỉ tạo đúng 1 đơn.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('idempotency_key', 64)->nullable()->after('order_code');
            $table->string('idempotency_scope', 100)->nullable()->after('idempotency_key');
            $table->unique(['idempotency_scope', 'idempotency_key'], 'orders_idempotency_unique');
            $table->index(['coupon_id', 'customer_phone'], 'idx_orders_coupon_phone');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique('orders_idempotency_unique');
            $table->dropIndex('idx_orders_coupon_phone');
            $table->dropColumn(['idempotency_key', 'idempotency_scope']);
        });
    }
};
