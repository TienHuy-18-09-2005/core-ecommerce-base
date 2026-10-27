<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public const SENT_MESSAGE = 'Nếu email đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.';

    /** Luôn trả cùng 1 response (kể cả email không tồn tại / bị throttle của broker) để chống dò email. */
    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $email = strtolower(trim($request->validated('email')));
        $user = User::where('email', $email)->where('is_active', true)->first();

        if ($user) {
            Password::broker()->sendResetLink(['email' => $email]);
        }

        return response()->json(['success' => true, 'message' => self::SENT_MESSAGE]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['email'] = strtolower(trim($data['email']));

        $status = Password::broker()->reset($data, function (User $user, string $password) {
            // Đổi mật khẩu + remember_token → mọi phiên/cookie "ghi nhớ" cũ mất hiệu lực
            // (Sanctum AuthenticateSession so password hash ở mỗi request), xóa token API.
            $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
            $user->tokens()->delete();
            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw new DomainException(
                DomainException::RESET_TOKEN_INVALID,
                'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.',
                422
            );
        }

        return response()->json(['success' => true, 'message' => 'Đã đặt lại mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.']);
    }
}
