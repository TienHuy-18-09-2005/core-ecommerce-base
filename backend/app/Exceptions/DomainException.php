<?php

namespace App\Exceptions;

use RuntimeException;

class DomainException extends RuntimeException
{
    public const STOCK_UNAVAILABLE = 'STOCK_UNAVAILABLE';

    public const CART_EMPTY = 'CART_EMPTY';

    public const PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE';

    public const CART_OWNER_REQUIRED = 'CART_OWNER_REQUIRED';

    public const ORDER_NOT_FOUND = 'ORDER_NOT_FOUND';

    public const INVALID_CREDENTIALS = 'INVALID_CREDENTIALS';

    public const ACCOUNT_DISABLED = 'ACCOUNT_DISABLED';

    public const WRONG_PASSWORD = 'WRONG_PASSWORD';

    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
    ) {
        parent::__construct($message);
    }
}
