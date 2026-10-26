<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Mỗi user chỉ có 1 đánh giá cho 1 sản phẩm (sửa thay vì đăng thêm). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->unique(['product_id', 'user_id'], 'uniq_reviews_product_user');
        });
    }

    public function down(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->dropUnique('uniq_reviews_product_user');
        });
    }
};
