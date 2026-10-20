<?php

namespace App\Services\Shop;

readonly class ResolvedCartOwner
{
    public function __construct(
        public ?int $userId,
        public ?string $plainToken,
        public bool $issued,
    ) {}
}
