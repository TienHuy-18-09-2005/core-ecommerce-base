<?php

return [
    // Phí ship cố định (VND) — server là nguồn duy nhất cho tổng tiền
    'shipping_fee' => (int) env('SHOP_SHIPPING_FEE', 30000),

    // Giỏ khách không hoạt động quá số ngày này sẽ bị dọn bởi carts:prune-guests
    'guest_cart_ttl_days' => (int) env('SHOP_GUEST_CART_TTL_DAYS', 30),
];
