<?php

return [
    // Phí ship cố định (VND) — server là nguồn duy nhất cho tổng tiền
    'shipping_fee' => (int) env('SHOP_SHIPPING_FEE', 30000),

    // Ngưỡng miễn phí ship (VND, 0 = tắt). Cả hai giá trị có thể ghi đè ở Cài đặt (R7).
    'free_shipping_threshold' => (int) env('SHOP_FREE_SHIPPING_THRESHOLD', 0),

    // Giỏ khách không hoạt động quá số ngày này sẽ bị dọn bởi carts:prune-guests
    'guest_cart_ttl_days' => (int) env('SHOP_GUEST_CART_TTL_DAYS', 30),
];
