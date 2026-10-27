<?php

namespace Database\Seeders;

use App\Support\Permissions;
use Illuminate\Database\Seeder;

/** Đồng bộ danh mục quyền và 4 vai trò mẫu (migration đã gọi sẵn; chạy lại an toàn khi thêm quyền mới). */
class RbacSeeder extends Seeder
{
    public function run(): void
    {
        Permissions::sync();
    }
}
