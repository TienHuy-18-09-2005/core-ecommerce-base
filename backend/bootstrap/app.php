<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum SPA: session cookie auth for first-party origins, no bearer/refresh token.
        $middleware->statefulApi();

        // The guest cart token is an HttpOnly cookie. It stays unencrypted so API
        // requests can read it even when the browser omits Origin (same-origin GET).
        // The plaintext is never stored; the database keeps only its SHA-256 hash.
        $middleware->encryptCookies(except: ['cart_token']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
