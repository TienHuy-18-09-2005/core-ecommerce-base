<?php

namespace App\Exceptions;

use RuntimeException;

class DomainException extends RuntimeException
{
    public const STOCK_UNAVAILABLE = 'STOCK_UNAVAILABLE';

    public const CART_EMPTY = 'CART_EMPTY';

    public const PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE';

    public const CART_OWNER_REQUIRED = 'CART_OWNER_REQUIRED';

    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
    ) {
        parent::__construct($message);
    }
}
