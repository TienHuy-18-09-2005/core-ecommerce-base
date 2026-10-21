<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\Shop\CartService;
use App\Services\Shop\GuestCartToken;
use App\Support\UserPresenter;
use App\Support\VietnamesePhone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;

/**
 * Sanctum SPA cookie auth: session + CSRF, không token. Sau đăng nhập/đăng ký,
 * giỏ khách (cookie cart_token) được gộp vào giỏ tài khoản ở server (§3.A / task 4.8).
 */
class AuthController extends Controller
{
    public const INVALID_MESSAGE = 'Email hoặc mật khẩu không đúng.';

    public function __construct(
        protected CartService $cartService,
        protected GuestCartToken $cartToken,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $credentials = ['email' => strtolower(trim($data['email'])), 'password' => $data['password']];

        if (! Auth::guard('web')->attempt($credentials, (bool) ($data['remember'] ?? false))) {
            throw new DomainException(DomainException::INVALID_CREDENTIALS, self::INVALID_MESSAGE, 422);
        }

        /** @var User $user */
        $user = Auth::guard('web')->user();
        if (! $user->is_active) {
            $this->endSession($request);
            // Cùng message chung để không lộ tài khoản tồn tại nhưng bị khoá
            throw new DomainException(DomainException::INVALID_CREDENTIALS, self::INVALID_MESSAGE, 422);
        }

        $request->session()->regenerate();

        return $this->authenticatedResponse($request, $user, 'Đăng nhập thành công.');
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => isset($data['phone']) ? VietnamesePhone::normalize($data['phone']) : null,
            'password' => $data['password'],
            'role' => 'customer',
            'is_active' => true,
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return $this->authenticatedResponse($request, $user, 'Đăng ký thành công.', 201);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->endSession($request);

        return response()->json(['success' => true, 'message' => 'Đã đăng xuất.']);
    }

    private function authenticatedResponse(Request $request, User $user, string $message, int $status = 200): JsonResponse
    {
        $adjustments = [];
        $plain = $request->cookie(GuestCartToken::COOKIE_NAME);
        $hadGuestToken = $this->cartToken->isValid(is_string($plain) ? $plain : null);

        if ($hadGuestToken) {
            $merged = $this->cartService->mergeGuestCartToUser($plain, $user->id);
            $adjustments = $merged['adjustments'];
        }

        $response = response()->json([
            'success' => true,
            'message' => $message,
            'data' => [
                'user' => UserPresenter::present($user),
                'cart_adjustments' => $adjustments,
            ],
        ], $status);

        if ($hadGuestToken) {
            $response->withCookie(Cookie::forget(GuestCartToken::COOKIE_NAME, config('session.path', '/'), config('session.domain')));
        }

        return $response;
    }

    private function endSession(Request $request): void
    {
        Auth::guard('web')->logout();
        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }
}
