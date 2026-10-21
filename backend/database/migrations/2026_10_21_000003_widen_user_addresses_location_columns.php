<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Checkout đang lưu tên Tỉnh/Quận/Phường dạng text (chưa có danh mục mã hành chính),
     * nên nới các cột *_code lên 100 ký tự để sổ địa chỉ dùng chung định dạng với đơn hàng.
     */
    public function up(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('province_code', 100)->change();
            $table->string('district_code', 100)->change();
            $table->string('ward_code', 100)->change();
        });
    }

    public function down(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('province_code', 20)->change();
            $table->string('district_code', 20)->change();
            $table->string('ward_code', 20)->change();
        });
    }
};
