<?php

use App\Support\Permissions;
use Illuminate\Database\Migrations\Migration;

// R7: thêm quyền settings.view vào danh mục (idempotent, không đụng vai trò đã chỉnh).
return new class extends Migration
{
    public function up(): void
    {
        Permissions::sync();
    }

    public function down(): void {}
};
