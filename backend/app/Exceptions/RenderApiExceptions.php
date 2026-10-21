<?php

namespace App\Exceptions;

use App\Services\Shop\GuestCartToken;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
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

        // 422 theo hợp đồng lỗi chuẩn (§2.3.6): {success:false, code, message, errors}
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! self::isApi($request)) {
                return null;
            }

            return response()->json([
                'success' => false,
                'code' => 'VALIDATION_ERROR',
                'message' => $e->validator->errors()->first() ?: 'Dữ liệu không hợp lệ.',
                'errors' => $e->errors(),
            ], $e->status);
        });

        // Chữ ký URL sai/hết hạn (hiện chỉ dùng cho link xác thực email)
        $exceptions->render(function (InvalidSignatureException $e, Request $request) {
            if (! self::isApi($request)) {
                return null;
            }

            return response()->json([
                'success' => false,
                'code' => DomainException::VERIFICATION_LINK_INVALID,
                'message' => 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.',
            ], 403);
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

            // Mọi lỗi 4xx đều có success:false + code (vd. 401, 403, 404, 429 mặc định của Laravel)
            if ($response->getStatusCode() >= 400) {
                $payload['success'] = false;
                $payload['code'] = $payload['code'] ?? self::defaultCode($response->getStatusCode());

                // Thông điệp mặc định của framework (tiếng Anh, có thể lộ tên route) → thông điệp tiếng Việt chuẩn
                $message = (string) ($payload['message'] ?? '');
                $standard = self::defaultMessage($response->getStatusCode());
                if ($standard !== null && ($message === '' || preg_match('/^[\x00-\x7F]*$/', $message) === 1)) {
                    $payload['message'] = $standard;
                }
            }

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

    private static function defaultCode(int $status): string
    {
        return match ($status) {
            401 => 'UNAUTHENTICATED',
            403 => 'FORBIDDEN',
            404 => 'NOT_FOUND',
            405 => 'METHOD_NOT_ALLOWED',
            419 => 'CSRF_MISMATCH',
            422 => 'VALIDATION_ERROR',
            429 => 'TOO_MANY_REQUESTS',
            default => 'REQUEST_FAILED',
        };
    }

    /** Thông điệp tiếng Việt chuẩn cho các mã HTTP chung; mã lỗi (code) giữ nguyên. */
    public static function defaultMessage(int $status): ?string
    {
        return match ($status) {
            401 => 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.',
            403 => 'Bạn không có quyền thực hiện thao tác này.',
            404 => 'Không tìm thấy dữ liệu.',
            405 => 'Phương thức không được hỗ trợ cho địa chỉ này.',
            419 => 'Phiên làm việc đã hết hạn. Vui lòng tải lại trang.',
            429 => 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
            default => null,
        };
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
