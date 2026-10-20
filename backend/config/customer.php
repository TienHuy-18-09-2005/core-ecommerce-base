<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Seeded demo customer
    |--------------------------------------------------------------------------
    |
    | CustomerUserSeeder creates one customer when a password is set.
    | There is no default password.
    |
    */

    'name' => env('CUSTOMER_NAME', 'Nguyễn Văn Khách'),

    'email' => env('CUSTOMER_EMAIL', 'customer@ecom.local'),

    'password' => env('CUSTOMER_PASSWORD'),

    'phone' => env('CUSTOMER_PHONE', '0900000002'),

];
