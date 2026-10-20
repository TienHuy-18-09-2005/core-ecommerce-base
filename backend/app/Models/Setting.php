<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'group_name',
        'key_name',
        'value',
    ];

    // Có thể tùy chỉnh lấy cấu hình nhanh qua static method ở tầng Service/Repository
}
