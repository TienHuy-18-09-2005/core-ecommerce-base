<?php

namespace App\Exceptions;

use App\Services\Shop\GuestCartToken;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class RenderApiExceptions
{
    public const SERVER_ERROR = 'SERVER_ERROR';

    public const SAFE_SERVER_MESSAGE = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';

    public static function register(Exceptions $exceptions): void
    {
        $exceptions->dontReport(DomainException::class);

        $exceptions->shouldRenderJsonWhen(function (Request $request): bool {
            return $request->is('api/*') || $request->expectsJson();
        });

        $exceptions->render(function (DomainException $e, Request $request) {
            if (! self::isApi($request)) {
                return null;
            }

            return response()->json([
                'success' => false,
                'code' => $e->errorCode,
                'message' => $e->getMessage(),
            ], $e->status);
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if (! self::isApi($request) || ! $e->getPrevious() instanceof ModelNotFoundException) {
                return null;
            }

            return response()->json([
                'success' => false,
                'code' => 'NOT_FOUND',
                'message' => 'Không tìm thấy dữ liệu.',
            ], 404);
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! self::isApi($request)) {
                return null;
            }

            if ($e instanceof ValidationException
                || $e instanceof AuthenticationException
                || $e instanceof AuthorizationException
                || $e instanceof HttpExceptionInterface
                || $e instanceof DomainException) {
                return null;
            }

            return self::serverError();
        });

        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            self::attachIssuedCartToken($request, $response);

            if (! self::isApi($request)) {
                return $response;
            }

            $payload = json_decode($response->getContent(), true);
            if (! is_array($payload)) {
                return $response;
            }

            unset($payload['trace'], $payload['exception'], $payload['file'], $payload['line']);

            if ($response->getStatusCode() >= 500) {
                $payload = [
                    'success' => false,
                    'code' => self::SERVER_ERROR,
                    'message' => self::SAFE_SERVER_MESSAGE,
                ];
            } elseif (self::containsSql((string) ($payload['message'] ?? ''))) {
                $payload['message'] = self::SAFE_SERVER_MESSAGE;
                $payload['code'] = $payload['code'] ?? self::SERVER_ERROR;
                $payload['success'] = false;
            }

            $response->setContent(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

            return $response;
        });
    }

    private static function attachIssuedCartToken(Request $request, Response $response): void
    {
        $token = $request->attributes->get('issued_cart_token');

        if (! is_string($token) || $token === '') {
            return;
        }

        $response->headers->setCookie(app(GuestCartToken::class)->makeCookie($token));
    }

    private static function serverError(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'code' => self::SERVER_ERROR,
            'message' => self::SAFE_SERVER_MESSAGE,
        ], 500);
    }

    private static function isApi(Request $request): bool
    {
        return $request->is('api/*') || $request->expectsJson();
    }

    private static function containsSql(string $message): bool
    {
        return preg_match('/SQLSTATE|SQL syntax|Base table or view not found/i', $message) === 1;
    }
}
