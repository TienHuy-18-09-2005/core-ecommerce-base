<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Route: GET /api/email/verify/{id}/{hash} + signed:relative (chữ ký + hạn dùng).
     * Không bắt buộc đăng nhập: người dùng có thể mở link trên thiết bị khác.
     */
    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::find($id);
        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            throw new DomainException(DomainException::VERIFICATION_LINK_INVALID, 'Liên kết xác thực không hợp lệ.', 403);
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return response()->json(['success' => true, 'message' => 'Email đã được xác thực.']);
    }

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return response()->json(['success' => true, 'message' => 'Email của bạn đã được xác thực.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['success' => true, 'message' => 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.']);
    }
}
