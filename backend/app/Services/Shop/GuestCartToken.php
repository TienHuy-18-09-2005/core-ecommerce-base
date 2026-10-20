<?php

namespace App\Services\Shop;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Cookie;

class GuestCartToken
{
    public const COOKIE_NAME = 'cart_token';

    public const LENGTH = 40;

    public const LIFETIME_MINUTES = 60 * 24 * 30;

    public function resolve(Request $request, bool $issueIfMissing = true): ResolvedCartOwner
    {
        $user = $request->user('sanctum');
        $userId = $user?->id;

        if ($userId !== null) {
            return new ResolvedCartOwner($userId, null, false);
        }

        $plain = $request->cookie(self::COOKIE_NAME);
        if ($this->isValid(is_string($plain) ? $plain : null)) {
            return new ResolvedCartOwner(null, $plain, false);
        }

        if (! $issueIfMissing) {
            return new ResolvedCartOwner(null, null, false);
        }

        $token = $this->issue();
        $this->rememberIssuedToken($request, $token);

        return new ResolvedCartOwner(null, $token, true);
    }

    /**
     * Value stored in carts.session_id. Null when the cart belongs to a user
     * or when a guest presented no valid token.
     */
    public function storageKey(ResolvedCartOwner $owner): ?string
    {
        if ($owner->userId !== null || $owner->plainToken === null) {
            return null;
        }

        return $this->hash($owner->plainToken);
    }

    public function hash(string $plainToken): string
    {
        return hash('sha256', $plainToken);
    }

    public function isValid(?string $token): bool
    {
        return is_string($token) && preg_match('/\A[A-Za-z0-9]{40}\z/', $token) === 1;
    }

    public function issue(): string
    {
        return Str::random(self::LENGTH);
    }

    /**
     * Form requests are a copy of the pipeline request. The exception renderer
     * sees the original, so the issued token has to live on both.
     */
    private function rememberIssuedToken(Request $request, string $token): void
    {
        $request->attributes->set('issued_cart_token', $token);

        if (! app()->bound('request')) {
            return;
        }

        $current = app('request');
        if ($current instanceof Request && $current !== $request) {
            $current->attributes->set('issued_cart_token', $token);
        }
    }

    public function attach(JsonResponse $response, ResolvedCartOwner $owner): JsonResponse
    {
        if (! $owner->issued || $owner->plainToken === null) {
            return $response;
        }

        return $response->cookie($this->makeCookie($owner->plainToken));
    }

    public function makeCookie(string $plainToken): Cookie
    {
        $sameSite = config('session.same_site') ?: 'lax';

        return cookie(
            self::COOKIE_NAME,
            $plainToken,
            self::LIFETIME_MINUTES,
            config('session.path', '/'),
            config('session.domain'),
            $this->secure(),
            true,
            false,
            $sameSite,
        );
    }

    private function secure(): bool
    {
        $secure = config('session.secure');

        if (is_string($secure)) {
            $parsed = filter_var($secure, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $secure = $parsed;
        }

        if ($secure === null) {
            return app()->environment('production');
        }

        return (bool) $secure;
    }
}
