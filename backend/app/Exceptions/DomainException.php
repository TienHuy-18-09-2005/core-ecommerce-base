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

    public const RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID';

    public const EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED';

    public const VERIFICATION_LINK_INVALID = 'VERIFICATION_LINK_INVALID';

    public const REVIEW_NOT_PURCHASED = 'REVIEW_NOT_PURCHASED';

    public const REVIEW_ALREADY_EXISTS = 'REVIEW_ALREADY_EXISTS';

    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
    ) {
        parent::__construct($message);
    }
}
