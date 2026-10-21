<?php

namespace App\Support;

class VietnamesePhone
{
    /** Di động VN: 0 hoặc +84/84, đầu số 3/5/7/8/9, tổng 10 số khi chuẩn hoá. */
    public const PATTERN = '/\A(?:\+?84|0)(?:3|5|7|8|9)\d{8}\z/';

    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/[\s.\-()]/', '', trim($phone)) ?? '';

        if (str_starts_with($digits, '+84')) {
            return '0'.substr($digits, 3);
        }

        if (str_starts_with($digits, '84') && strlen($digits) === 11) {
            return '0'.substr($digits, 2);
        }

        return $digits;
    }

    public static function isValid(string $phone): bool
    {
        return preg_match(self::PATTERN, preg_replace('/[\s.\-()]/', '', trim($phone)) ?? '') === 1;
    }

    public static function mask(string $phone): string
    {
        $len = strlen($phone);
        if ($len <= 6) {
            return str_repeat('*', $len);
        }

        return substr($phone, 0, 3).str_repeat('*', $len - 6).substr($phone, -3);
    }
}
