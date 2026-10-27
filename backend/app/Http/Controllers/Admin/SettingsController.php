<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\AdminPasswordRequest;
use App\Http\Requests\Admin\SettingsRequest;
use App\Services\Support\AuditLogger;
use App\Services\Support\ShopSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;

/** R7: cài đặt cửa hàng + đổi mật khẩu tài khoản quản trị. */
class SettingsController extends Controller
{
    public function __construct(private ShopSettings $settings, private AuditLogger $audit) {}

    public function show(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->settings->all() + ['defaults' => $this->settings->defaults()]]);
    }

    public function update(SettingsRequest $request): JsonResponse
    {
        [$before, $after] = $this->settings->update($request->validated());
        $diff = $this->audit->diff($before, $after);
        if ($diff !== []) {
            $this->audit->record('settings.updated', 'Setting', $diff);
        }

        return response()->json(['success' => true, 'message' => 'Đã lưu cài đặt.', 'data' => $after + ['defaults' => $this->settings->defaults()]]);
    }

    /** Đổi mật khẩu người đang đăng nhập; đăng xuất mọi phiên/token khác. Nhật ký không chứa mật khẩu. */
    public function password(AdminPasswordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw new DomainException(DomainException::WRONG_PASSWORD, 'Mật khẩu hiện tại không đúng.', 422);
        }

        $user->forceFill(['password' => $data['password']])->save();

        // Token API khác (giữ token đang dùng nếu gọi bằng Bearer)
        $current = $user->currentAccessToken();
        $user->tokens()->when($current instanceof PersonalAccessToken, fn ($q) => $q->whereKeyNot($current->getKey()))->delete();

        $others = 0;
        if ($request->hasSession()) {
            $sid = $request->session()->getId();
            if (config('session.driver') === 'database') {
                $others = DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->where('id', '!=', $sid)->delete();
            }
            Auth::guard('web')->logoutOtherDevices($data['password']);
            $request->session()->regenerate();
        }

        $this->audit->record('account.password_changed', $user, ['sessions_revoked' => $others]);

        return response()->json(['success' => true, 'message' => 'Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.']);
    }
}
