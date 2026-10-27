<?php

/*
 * Thông tin cửa hàng dùng cho phiếu giao hàng.
 * Giá trị mặc định; R7 (Cài đặt) ghi đè từ bảng settings (store_name, store_phone, store_address).
 */
return [
    'name' => env('STORE_NAME', 'Đồ Điện Siêu Xịn'),
    'phone' => env('STORE_PHONE', ''),
    'address' => env('STORE_ADDRESS', ''),
    'email' => env('STORE_EMAIL', ''),
];
