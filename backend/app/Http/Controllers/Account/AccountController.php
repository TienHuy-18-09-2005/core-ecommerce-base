<?php

namespace App\Http\Controllers\Account;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Account\AddressRequest;
use App\Http\Requests\Account\ChangePasswordRequest;
use App\Http\Requests\Account\UpdateProfileRequest;
use App\Models\Order;
use App\Models\UserAddress;
use App\Services\Shop\OrderPresenter;
use App\Support\UserPresenter;
use App\Support\VietnamesePhone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/** Mọi route ở đây nằm sau auth:sanctum; dữ liệu luôn lọc theo user hiện tại. */
class AccountController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => UserPresenter::present($request->user())]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();
        $user->update([
            'name' => $data['name'],
            'phone' => isset($data['phone']) ? VietnamesePhone::normalize($data['phone']) : null,
        ]);

        return response()->json(['success' => true, 'message' => 'Đã cập nhật thông tin.', 'data' => UserPresenter::present($user)]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw new DomainException(DomainException::WRONG_PASSWORD, 'Mật khẩu hiện tại không đúng.', 422);
        }

        $user->update(['password' => $data['password']]);
        // Đăng xuất các phiên khác, giữ phiên hiện tại (đổi session id)
        if ($request->hasSession()) {
            Auth::guard('web')->logoutOtherDevices($data['password']);
            $request->session()->regenerate();
        }

        return response()->json(['success' => true, 'message' => 'Đã đổi mật khẩu.']);
    }

    public function orders(Request $request, OrderPresenter $presenter): JsonResponse
    {
        $page = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->latest('id')
            ->paginate(min(max((int) $request->query('per_page', 10), 1), 50));

        return response()->json([
            'success' => true,
            'data' => array_map(fn (Order $o) => $presenter->full($o), $page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function addresses(Request $request): JsonResponse
    {
        $list = $request->user()->addresses()->orderByDesc('is_default')->orderBy('id')->get();

        return response()->json(['success' => true, 'data' => $list->map(fn ($a) => $this->presentAddress($a))->all()]);
    }

    public function storeAddress(AddressRequest $request): JsonResponse
    {
        $user = $request->user();
        if ($user->addresses()->count() >= 10) {
            throw new DomainException('ADDRESS_LIMIT', 'Sổ địa chỉ tối đa 10 địa chỉ.', 422);
        }

        $address = DB::transaction(function () use ($request, $user) {
            $data = $this->addressData($request->validated());
            $data['is_default'] = $data['is_default'] || ! $user->addresses()->exists();
            if ($data['is_default']) {
                $user->addresses()->update(['is_default' => false]);
            }

            return $user->addresses()->create($data);
        });

        return response()->json(['success' => true, 'message' => 'Đã thêm địa chỉ.', 'data' => $this->presentAddress($address)], 201);
    }

    public function updateAddress(AddressRequest $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = $user->addresses()->whereKey($id)->firstOrFail();

        DB::transaction(function () use ($request, $user, $address) {
            $data = $this->addressData($request->validated());
            if ($data['is_default']) {
                $user->addresses()->whereKeyNot($address->id)->update(['is_default' => false]);
            } else {
                unset($data['is_default']);
            }
            $address->update($data);
        });

        return response()->json(['success' => true, 'message' => 'Đã cập nhật địa chỉ.', 'data' => $this->presentAddress($address->fresh())]);
    }

    public function destroyAddress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = $user->addresses()->whereKey($id)->firstOrFail();
        $wasDefault = $address->is_default;
        $address->delete();

        if ($wasDefault) {
            $user->addresses()->orderBy('id')->first()?->update(['is_default' => true]);
        }

        return response()->json(['success' => true, 'message' => 'Đã xoá địa chỉ.']);
    }

    private function addressData(array $v): array
    {
        return [
            'recipient_name' => $v['recipient_name'],
            'recipient_phone' => VietnamesePhone::normalize($v['recipient_phone']),
            'province_code' => $v['province'],
            'district_code' => $v['district'],
            'ward_code' => $v['ward'],
            'street_address' => $v['street_address'],
            'is_default' => (bool) ($v['is_default'] ?? false),
        ];
    }

    private function presentAddress(UserAddress $a): array
    {
        return [
            'id' => $a->id,
            'recipient_name' => $a->recipient_name,
            'recipient_phone' => $a->recipient_phone,
            'province' => $a->province_code,
            'district' => $a->district_code,
            'ward' => $a->ward_code,
            'street_address' => $a->street_address,
            'is_default' => (bool) $a->is_default,
        ];
    }
}
