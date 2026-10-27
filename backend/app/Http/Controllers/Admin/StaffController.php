<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StaffRolesRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\Admin\PermissionService;
use App\Services\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Bản tối giản của "Người dùng" (R11 chưa làm): danh sách nhân viên/admin và gán nhiều vai trò. */
class StaffController extends Controller
{
    public function __construct(private AuditLogger $audit, private PermissionService $perms) {}

    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'role_id' => ['nullable', 'integer']]);
        $q = trim((string) ($f['q'] ?? ''));
        $like = '%'.addcslashes($q, '%_\\').'%';
        $page = User::query()->whereIn('role', ['staff', 'admin'])->with('roles:id,name')
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('name', 'like', $like)->orWhere('email', 'like', $like)))
            ->when(! empty($f['role_id']), fn ($w) => $w->whereHas('roles', fn ($r) => $r->where('roles.id', $f['role_id'])))
            ->orderByRaw("case when role = 'admin' then 0 else 1 end")->orderBy('name')->paginate(20);

        return $this->paginated($page, fn (User $u) => $this->present($u));
    }

    /** Thêm nhân viên từ một tài khoản đã đăng ký (khách hàng → nhân viên) kèm vai trò. */
    public function store(StaffRolesRequest $request): JsonResponse
    {
        $d = $request->validated();
        $user = User::where('email', strtolower(trim($d['email'])))->first();
        if (! $user) {
            throw new DomainException(DomainException::STAFF_INVALID, 'Chưa có tài khoản với email này. Hãy để người đó đăng ký trước hoặc dùng lệnh admin:create --role=staff.', 422);
        }
        $this->guard($request, $user);
        if ($d['role_ids'] === []) {
            throw new DomainException(DomainException::STAFF_INVALID, 'Hãy chọn ít nhất một vai trò cho nhân viên.', 422);
        }
        $old = $user->role;
        DB::transaction(function () use ($user, $d) {
            $user->forceFill(['role' => 'staff'])->save();
            $user->roles()->sync($d['role_ids']);
        });
        $this->perms->forget($user->id);
        $this->audit->record('staff.added', $user, ['role' => [$old, 'staff'], 'roles' => $this->names($d['role_ids'])]);

        return response()->json(['success' => true, 'message' => 'Đã thêm nhân viên.', 'data' => $this->present($user->load('roles'))], 201);
    }

    public function updateRoles(StaffRolesRequest $request, User $user): JsonResponse
    {
        $this->guard($request, $user);
        if ($user->role !== 'staff') {
            throw new DomainException(DomainException::STAFF_INVALID, 'Tài khoản này không phải nhân viên.', 422);
        }
        $before = $user->roles()->pluck('roles.id')->map(fn ($v) => (int) $v)->all();
        $after = array_map('intval', $request->validated()['role_ids']);
        $user->roles()->sync($after);
        $this->perms->forget($user->id);
        $added = array_values(array_diff($after, $before));
        $removed = array_values(array_diff($before, $after));
        if ($added || $removed) {
            $this->audit->record('staff.roles_updated', $user, ['added' => $this->names($added), 'removed' => $this->names($removed)]);
        }

        return response()->json(['success' => true, 'message' => 'Đã cập nhật vai trò.', 'data' => $this->present($user->load('roles'))]);
    }

    /** Thu hồi quyền nhân viên: về khách hàng, gỡ mọi vai trò. */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->guard($request, $user);
        if ($user->role !== 'staff') {
            throw new DomainException(DomainException::STAFF_INVALID, 'Tài khoản này không phải nhân viên.', 422);
        }
        $names = $user->roles()->pluck('name')->all();
        DB::transaction(function () use ($user) {
            $user->roles()->detach();
            $user->forceFill(['role' => 'customer'])->save();
        });
        $this->perms->forget($user->id);
        $this->audit->record('staff.removed', $user, ['role' => ['staff', 'customer'], 'roles' => $names]);

        return response()->json(['success' => true, 'message' => 'Đã thu hồi quyền nhân viên.']);
    }

    /** Không sửa admin và không tự sửa chính mình qua màn hình này. */
    private function guard(Request $request, User $user): void
    {
        if ($user->id === $request->user()->id) {
            throw new DomainException(DomainException::STAFF_INVALID, 'Không thể tự thay đổi vai trò của chính mình.', 422);
        }
        if ($user->role === 'admin') {
            throw new DomainException(DomainException::STAFF_INVALID, 'Không thể đổi vai trò của quản trị viên.', 422);
        }
    }

    /** @param list<int> $ids */
    private function names(array $ids): array
    {
        return $ids ? Role::whereIn('id', $ids)->orderBy('name')->pluck('name')->all() : [];
    }

    private function present(User $u): array
    {
        return [
            'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'role' => $u->role, 'is_active' => (bool) $u->is_active,
            'roles' => $u->roles->map(fn (Role $r) => ['id' => $r->id, 'name' => $r->name])->values()->all(),
        ];
    }
}
