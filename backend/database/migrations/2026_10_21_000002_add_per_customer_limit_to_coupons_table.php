<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            // Số lần tối đa 1 khách (theo user_id hoặc SĐT) được dùng mã; null = không giới hạn
            $table->unsignedInteger('per_customer_limit')->nullable()->after('usage_limit');
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn('per_customer_limit');
        });
    }
};
