<?php

/*
 * Thông tin cửa hàng dùng cho phiếu giao hàng.
 * R7 (Cài đặt) sẽ ghi đè các giá trị này từ bảng settings (nhóm "store"); hiện đọc từ env.
 */
return [
    'name' => env('STORE_NAME', env('APP_NAME', 'Cửa hàng')),
    'phone' => env('STORE_PHONE', ''),
    'address' => env('STORE_ADDRESS', ''),
    'email' => env('STORE_EMAIL', ''),
];
