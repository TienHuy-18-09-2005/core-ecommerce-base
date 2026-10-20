<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Seeded administrator
    |--------------------------------------------------------------------------
    |
    | AdminUserSeeder creates one admin when both email and password are set.
    | There is no default password. Leave ADMIN_PASSWORD empty to skip seeding.
    |
    */

    'name' => env('ADMIN_NAME', 'Administrator'),

    'email' => env('ADMIN_EMAIL'),

    'password' => env('ADMIN_PASSWORD'),

    'phone' => env('ADMIN_PHONE'),

];
