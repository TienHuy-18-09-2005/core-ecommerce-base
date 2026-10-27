<?php

namespace App\Http\Controllers\Admin;

use App\Exceptions\DomainException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RoleRequest;
use App\Models\Permission;
use App\Models\Role;
use App\Services\Admin\PermissionService;
use App\Services\Support\AuditLogger;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    public function __construct(private AuditLogger $audit, private PermissionService $perms) {}

    /** Danh mục quyền theo nhóm cho ma trận checkbox. */
    public function permissions(): JsonResponse
    {
        $groups = [];
        foreach (Permissions::GROUPS as $id => $g) {
            $groups[] = ['id' => $id, 'label' => $g['label'], 'items' => array_map(
                fn ($key, $label) => ['key' => $key, 'label' => $label, 'admin_only' => in_array($key, Permissions::ADMIN_ONLY, true)],
                array_keys($g['items']), array_values($g['items']))];
        }

        return response()->json(['success' => true, 'data' => $groups]);
    }

    public function index(Request $request): JsonResponse
    {
        $f = $request->validate(['q' => ['nullable', 'string', 'max:100'], 'permission' => ['nullable', 'string', 'max:60']]);
        $q = trim((string) ($f['q'] ?? ''));
        $roles = Role::query()->with('permissions:id,key')->withCount('users')
            ->when($q !== '', fn ($w) => $w->where('name', 'like', '%'.addcslashes($q, '%_\\').'%'))
            ->when(! empty($f['permission']), fn ($w) => $w->whereHas('permissions', fn ($p) => $p->where('key', $f['permission'])))
            ->orderByDesc('is_system')->orderBy('name')->get();

        return response()->json(['success' => true, 'data' => $roles->map(fn (Role $r) => $this->present($r))->all()]);
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $d = $request->validated();
        $role = DB::transaction(function () use ($d) {
            $role = Role::create(['name' => $d['name'], 'description' => $d['description'] ?? null, 'slug' => $this->slug($d['name'])]);
            $role->permissions()->sync(Permission::whereIn('key', $d['permissions'])->pluck('id'));

            return $role;
        });
        $this->audit->record('role.created', $role, ['name' => $role->name, 'permissions' => array_values($d['permissions'])]);

        return response()->json(['success' => true, 'message' => 'Đã tạo vai trò.', 'data' => $this->present($role->load('permissions')->loadCount('users'))], 201);
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $d = $request->validated();
        $before = $this->present($role->load('permissions')->loadCount('users'));
        DB::transaction(function () use ($role, $d) {
            $role->update(['name' => $d['name'], 'description' => $d['description'] ?? null]);
            $role->permissions()->sync(Permission::whereIn('key', $d['permissions'])->pluck('id'));
        });
        $this->perms->forgetRole($role->id);
        $after = $this->present($role->load('permissions')->loadCount('users'));
        $changes = $this->audit->diff(['name' => $before['name'], 'description' => $before['description']], ['name' => $after['name'], 'description' => $after['description']]);
        $added = array_values(array_diff($after['permissions'], $before['permissions']));
        $removed = array_values(array_diff($before['permissions'], $after['permissions']));
        if ($added || $removed) {
            $changes['permissions'] = ['added' => $added, 'removed' => $removed];
        }
        $this->audit->record('role.updated', $role, $changes ?: null);

        return response()->json(['success' => true, 'message' => 'Đã lưu vai trò.', 'data' => $after]);
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->users()->exists()) {
            throw new DomainException(DomainException::ROLE_IN_USE, 'Vai trò đang được gán cho nhân viên, hãy gỡ vai trò khỏi nhân viên trước khi xóa.', 409);
        }
        $role->delete();
        $this->audit->record('role.deleted', $role, ['name' => $role->name]);

        return response()->json(['success' => true, 'message' => 'Đã xóa vai trò.']);
    }

    private function slug(string $name): string
    {
        $base = Str::slug($name) ?: 'vai-tro';
        $slug = $base;
        for ($i = 2; Role::where('slug', $slug)->exists(); $i++) {
            $slug = $base.'-'.$i;
        }

        return $slug;
    }

    private function present(Role $r): array
    {
        return [
            'id' => $r->id, 'slug' => $r->slug, 'name' => $r->name, 'description' => $r->description, 'is_system' => $r->is_system,
            'permissions' => $r->permissions->pluck('key')->sort()->values()->all(),
            'users_count' => (int) ($r->users_count ?? 0),
            'updated_at' => $r->updated_at?->toIso8601String(),
        ];
    }
}
