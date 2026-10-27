<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Services\Admin\PermissionService;
use App\Support\Permissions;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** R6: phân quyền RBAC — ma trận quyền theo vai trò mẫu, hợp quyền nhiều vai trò, cache, ẩn doanh thu. */
class AdminRbacTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    private function staff(string ...$slugs): User
    {
        $u = User::factory()->create(['role' => 'staff']);
        $u->roles()->sync(Role::whereIn('slug', $slugs)->pluck('id'));

        return $u;
    }

    private function as(User $user): static
    {
        return $this->withHeader('Origin', 'http://localhost:5173')->withCredentials()->actingAs($user);
    }

    private function order(string $code = 'ORD-RBAC0001'): Order
    {
        return Order::create([
            'order_code' => $code, 'customer_name' => 'Nguyễn A', 'customer_phone' => '0900000000',
            'shipping_province' => 'Hà Nội', 'shipping_district' => 'Ba Đình', 'shipping_ward' => 'Điện Biên', 'shipping_address' => '1 Test',
            'subtotal' => 100000, 'discount_amount' => 0, 'shipping_fee' => 30000, 'total_amount' => 130000,
            'payment_method' => 'cod', 'payment_status' => 'unpaid', 'status' => 'pending',
        ]);
    }

    private function product(): Product
    {
        $p = Product::create(['name' => 'Đèn', 'slug' => 'den-'.uniqid(), 'status' => 'published']);
        ProductVariant::create(['product_id' => $p->id, 'sku' => 'SKU-'.uniqid(), 'name' => 'V', 'price' => 1000, 'stock_quantity' => 5, 'is_default' => true, 'is_active' => true]);

        return $p;
    }

    /** Gọi một loạt endpoint và trả về [tên => status]. */
    private function matrix(User $u): array
    {
        $p = $this->product();
        $o = $this->order('ORD-'.strtoupper(uniqid()));
        $calls = [
            'dashboard' => ['getJson', '/api/admin/dashboard'],
            'products.list' => ['getJson', '/api/admin/products'],
            'products.show' => ['getJson', "/api/admin/products/{$p->id}"],
            'products.history' => ['getJson', "/api/admin/products/{$p->id}/history"],
            'products.update' => ['putJson', "/api/admin/products/{$p->id}", ['name' => 'Đèn mới']],
            'products.duplicate' => ['postJson', "/api/admin/products/{$p->id}/duplicate"],
            'categories.list' => ['getJson', '/api/admin/categories'],
            'categories.create' => ['postJson', '/api/admin/categories', ['name' => 'DM '.uniqid()]],
            'coupons.list' => ['getJson', '/api/admin/coupons'],
            'coupons.create' => ['postJson', '/api/admin/coupons', []],
            'orders.list' => ['getJson', '/api/admin/orders'],
            'orders.show' => ['getJson', "/api/admin/orders/{$o->id}"],
            'orders.note' => ['postJson', "/api/admin/orders/{$o->id}/notes", ['body' => 'Đã gọi khách']],
            'orders.confirm' => ['patchJson', "/api/admin/orders/{$o->id}/status", ['status' => 'confirmed']],
            'orders.cancel' => ['patchJson', "/api/admin/orders/{$o->id}/status", ['status' => 'cancelled', 'cancel_reason' => 'Khách hủy']],
            'orders.print' => ['getJson', "/api/admin/orders/print?ids[]={$o->id}"],
            'reviews.list' => ['getJson', '/api/admin/reviews'],
            'roles.list' => ['getJson', '/api/admin/roles'],
            'staff.list' => ['getJson', '/api/admin/staff'],
        ];
        $out = [];
        foreach ($calls as $name => $c) {
            $out[$name] = $this->as($u)->{$c[0]}($c[1], $c[2] ?? [])->status() === 403 ? 'deny' : 'allow';
        }

        return $out;
    }

    private function assertMatrix(User $u, array $allowed): void
    {
        $m = $this->matrix($u);
        foreach ($m as $name => $result) {
            $this->assertSame(in_array($name, $allowed, true) ? 'allow' : 'deny', $result, "Sai quyền ở {$name}");
        }
    }

    public function test_migration_seeds_catalog_and_four_presets(): void
    {
        $this->assertSame(count(Permissions::all()), \App\Models\Permission::count());
        $this->assertEqualsCanonicalizing(['product_manager', 'order_processor', 'accountant', 'customer_care'], Role::pluck('slug')->all());
        foreach (Role::with('permissions')->get() as $r) {
            $this->assertContains('products.view', $r->permissions->pluck('key'), "{$r->name} phải có products.view");
        }
        Permissions::sync(); // chạy lại không nhân đôi
        $this->assertSame(4, Role::count());
    }

    public function test_admin_has_every_permission(): void
    {
        $this->assertMatrix($this->admin, array_keys($this->matrix($this->admin)));
        $this->as($this->admin)->getJson('/api/user')->assertOk()->assertJsonPath('data.permissions', Permissions::all());
    }

    public function test_product_manager_matrix(): void
    {
        $this->assertMatrix($this->staff('product_manager'), [
            'dashboard', 'products.list', 'products.show', 'products.history', 'products.update', 'products.duplicate',
            'categories.list', 'categories.create', 'coupons.list', 'reviews.list',
        ]);
    }

    public function test_order_processor_matrix(): void
    {
        $this->assertMatrix($this->staff('order_processor'), [
            'dashboard', 'products.list', 'products.show', 'coupons.list',
            'orders.list', 'orders.show', 'orders.note', 'orders.confirm', 'orders.cancel', 'orders.print',
        ]);
    }

    public function test_accountant_matrix_sees_revenue_but_not_audit_log(): void
    {
        $u = $this->staff('accountant');
        $this->assertMatrix($u, ['dashboard', 'products.list', 'products.show', 'coupons.list', 'orders.list', 'orders.show', 'orders.print']);
        $p = $this->product();
        $this->as($u)->getJson("/api/admin/products/{$p->id}/history")->assertForbidden();
        $this->as($u)->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonStructure(['data' => ['stats' => ['revenue_today', 'revenue_14d'], 'revenue_series' => [['date', 'orders', 'revenue']]]]);
    }

    public function test_customer_care_cannot_cancel_but_can_note(): void
    {
        $u = $this->staff('customer_care');
        $this->assertMatrix($u, ['dashboard', 'products.list', 'products.show', 'coupons.list', 'orders.list', 'orders.show', 'orders.note', 'reviews.list']);
        $o = $this->order('ORD-CSKH0001');
        $this->as($u)->patchJson("/api/admin/orders/{$o->id}/status", ['status' => 'cancelled', 'cancel_reason' => 'x'])->assertForbidden();
        $this->as($u)->postJson('/api/admin/orders/bulk-status', ['ids' => [$o->id], 'status' => 'cancelled', 'cancel_reason' => 'x'])->assertForbidden();
        $this->assertSame('pending', $o->fresh()->status);
        $this->as($u)->postJson("/api/admin/orders/{$o->id}/notes", ['body' => 'Đã gọi xác nhận địa chỉ'])->assertCreated();
    }

    public function test_product_manager_dashboard_has_no_revenue_fields(): void
    {
        $this->order();
        $res = $this->as($this->staff('product_manager'))->getJson('/api/admin/dashboard')->assertOk();
        $this->assertArrayNotHasKey('revenue_today', $res->json('data.stats'));
        $this->assertArrayNotHasKey('revenue_14d', $res->json('data.stats'));
        $this->assertArrayNotHasKey('revenue', $res->json('data.revenue_series.0'));
        $this->assertSame([], $res->json('data.recent_orders'), 'không có orders.view thì không thấy đơn gần đây');
        $this->assertStringNotContainsString('130000', $res->getContent());
    }

    public function test_two_roles_give_union_of_permissions(): void
    {
        $u = $this->staff('product_manager', 'accountant');
        $p = $this->product();
        $this->as($u)->postJson("/api/admin/products/{$p->id}/duplicate")->assertCreated();
        $this->as($u)->getJson('/api/admin/dashboard')->assertOk()->assertJsonStructure(['data' => ['stats' => ['revenue_today']]]);
        $this->as($u)->getJson('/api/admin/orders')->assertOk();
        $this->as($u)->patchJson("/api/admin/orders/{$this->order()->id}/status", ['status' => 'cancelled', 'cancel_reason' => 'x'])->assertForbidden();
        $perms = $this->as($u)->getJson('/api/user')->json('data.permissions');
        $this->assertContains('products.edit', $perms);
        $this->assertContains('revenue.view', $perms);
        $this->assertNotContains('orders.cancel', $perms);
    }

    public function test_staff_without_roles_and_customers_are_forbidden_everywhere(): void
    {
        foreach ([User::factory()->create(['role' => 'staff']), User::factory()->create(), User::factory()->create(['role' => 'staff', 'is_active' => false])] as $u) {
            if ($u->role === 'staff' && ! $u->is_active) {
                $u->roles()->sync(Role::pluck('id'));
            }
            $this->assertSame([], array_keys(array_filter($this->matrix($u), fn ($r) => $r === 'allow')));
        }
        $this->as(User::factory()->create())->getJson('/api/user')->assertJsonPath('data.permissions', []);
    }

    public function test_permissions_are_cached_and_invalidated_on_role_assignment_change(): void
    {
        $u = $this->staff('product_manager', 'accountant');
        $this->as($u)->getJson('/api/admin/dashboard')->assertOk();
        $this->assertTrue(Cache::has(PermissionService::key($u->id)));

        $pm = Role::where('slug', 'product_manager')->value('id');
        $this->as($this->admin)->putJson("/api/admin/staff/{$u->id}/roles", ['role_ids' => [Role::where('slug', 'accountant')->value('id')]])->assertOk();
        $this->assertFalse(Cache::has(PermissionService::key($u->id)));
        // Request kế tiếp: mất quyền sửa sản phẩm ngay
        $this->as($u)->putJson("/api/admin/products/{$this->product()->id}", ['name' => 'X'])->assertForbidden();
        $log = AdminAuditLog::where('action', 'staff.roles_updated')->where('subject_id', $u->id)->first();
        $this->assertSame(['added' => [], 'removed' => ['Quản lý sản phẩm']], $log->changes);
        $this->assertNotNull($pm);
    }

    public function test_cache_invalidated_when_role_permissions_change(): void
    {
        $u = $this->staff('accountant');
        $this->as($u)->getJson('/api/admin/dashboard')->assertJsonStructure(['data' => ['stats' => ['revenue_today']]]);
        $role = Role::where('slug', 'accountant')->first();
        $keep = array_values(array_diff($role->permissions()->pluck('key')->all(), ['revenue.view']));
        $this->as($this->admin)->putJson("/api/admin/roles/{$role->id}", ['name' => $role->name, 'permissions' => $keep])->assertOk()
            ->assertJsonPath('data.users_count', 1);
        $res = $this->as($u)->getJson('/api/admin/dashboard')->assertOk();
        $this->assertArrayNotHasKey('revenue_today', $res->json('data.stats'));
        $log = AdminAuditLog::where('action', 'role.updated')->latest('id')->first();
        $this->assertSame(['added' => [], 'removed' => ['revenue.view']], $log->changes['permissions']);
    }

    public function test_role_crud_validation_and_in_use_protection(): void
    {
        $res = $this->as($this->admin)->postJson('/api/admin/roles', ['name' => 'Kho', 'description' => 'Thủ kho', 'permissions' => ['products.view', 'orders.view']])
            ->assertCreated()->assertJsonPath('data.slug', 'kho')->assertJsonPath('data.permissions', ['orders.view', 'products.view']);
        $id = $res->json('data.id');
        $this->as($this->admin)->postJson('/api/admin/roles', ['name' => 'Kho', 'permissions' => []])->assertStatus(422)->assertJsonValidationErrors('name');
        // roles.manage không gán được: nhân viên không thể tự nâng quyền quản lý vai trò
        $this->as($this->admin)->putJson("/api/admin/roles/{$id}", ['name' => 'Kho', 'permissions' => ['roles.manage']])->assertStatus(422);
        $this->as($this->admin)->postJson('/api/admin/roles', ['name' => 'Lạ', 'permissions' => ['hack.all']])->assertStatus(422);

        $u = $this->staff();
        $u->roles()->sync([$id]);
        $this->as($this->admin)->deleteJson("/api/admin/roles/{$id}")->assertStatus(409)->assertJsonPath('code', 'ROLE_IN_USE');
        $u->roles()->detach();
        $this->as($this->admin)->deleteJson("/api/admin/roles/{$id}")->assertOk();
        $this->assertTrue(AdminAuditLog::where('action', 'role.created')->exists());
        $this->assertTrue(AdminAuditLog::where('action', 'role.deleted')->exists());

        $this->as($this->admin)->getJson('/api/admin/roles?permission=revenue.view')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.slug', 'accountant');
        $groups = $this->as($this->admin)->getJson('/api/admin/permissions')->assertOk()->json('data');
        $this->assertSame(count(Permissions::GROUPS), count($groups));
    }

    public function test_staff_cannot_manage_roles_even_if_role_row_has_roles_manage(): void
    {
        $role = Role::where('slug', 'product_manager')->first();
        $role->permissions()->attach(\App\Models\Permission::where('key', 'roles.manage')->value('id'));
        $u = $this->staff('product_manager');
        $this->as($u)->getJson('/api/admin/roles')->assertForbidden();
        $this->as($u)->putJson("/api/admin/staff/{$u->id}/roles", ['role_ids' => Role::pluck('id')->all()])->assertForbidden();
        $this->assertNotContains('roles.manage', $u->fresh()->permissions());
    }

    public function test_staff_add_assign_and_revoke(): void
    {
        $c = User::factory()->create(['email' => 'nv@shop.vn']);
        $ids = Role::whereIn('slug', ['order_processor', 'customer_care'])->pluck('id')->all();
        $this->as($this->admin)->postJson('/api/admin/staff', ['email' => 'nv@shop.vn', 'role_ids' => []])->assertStatus(422);
        $this->as($this->admin)->postJson('/api/admin/staff', ['email' => 'khongco@shop.vn', 'role_ids' => $ids])->assertStatus(422);
        $this->as($this->admin)->postJson('/api/admin/staff', ['email' => 'NV@shop.vn', 'role_ids' => $ids])->assertCreated()
            ->assertJsonPath('data.role', 'staff')->assertJsonCount(2, 'data.roles');
        $this->as($c->fresh())->getJson('/api/admin/orders')->assertOk();

        $this->as($this->admin)->getJson('/api/admin/staff?role_id='.$ids[0])->assertOk()->assertJsonCount(1, 'data');
        $this->as($this->admin)->getJson('/api/admin/staff?q=nv@')->assertOk()->assertJsonPath('data.0.email', 'nv@shop.vn');
        // Không sửa admin / chính mình
        $this->as($this->admin)->putJson("/api/admin/staff/{$this->admin->id}/roles", ['role_ids' => []])->assertStatus(422);

        $this->as($this->admin)->deleteJson("/api/admin/staff/{$c->id}")->assertOk();
        $this->assertSame('customer', $c->fresh()->role);
        $this->as($c->fresh())->getJson('/api/admin/orders')->assertForbidden();
        $this->assertTrue(AdminAuditLog::where('action', 'staff.added')->exists());
        $this->assertTrue(AdminAuditLog::where('action', 'staff.removed')->exists());
    }

    public function test_create_admin_command_supports_staff_roles(): void
    {
        $this->artisan('admin:create', ['--email' => 'kt@shop.vn', '--name' => 'Kế toán', '--password' => 'matkhau123', '--role' => 'staff', '--staff-role' => 'accountant,product_manager'])
            ->assertSuccessful();
        $u = User::where('email', 'kt@shop.vn')->first();
        $this->assertSame('staff', $u->role);
        $this->assertEqualsCanonicalizing(['accountant', 'product_manager'], $u->roles()->pluck('slug')->all());
        $this->artisan('admin:create', ['--email' => 'x@shop.vn', '--password' => 'matkhau123', '--role' => 'staff', '--staff-role' => 'khong_co'])->assertFailed();
    }

    public function test_duplicate_copies_image_files(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('products/goc.webp', 'IMG');
        $p = $this->product();
        $p->media()->create(['file_url' => '/storage/products/goc.webp', 'file_path' => 'products/goc.webp', 'media_type' => 'image', 'sort_order' => 0, 'is_primary' => true]);
        $p->media()->create(['file_url' => 'https://cdn.example.com/a.jpg', 'file_path' => null, 'media_type' => 'image', 'sort_order' => 1, 'is_primary' => false]);

        $res = $this->as($this->admin)->postJson("/api/admin/products/{$p->id}/duplicate")->assertCreated();
        $copy = Product::find($res->json('data.id'));
        $media = $copy->media()->orderBy('sort_order')->get();
        $this->assertCount(2, $media);
        $this->assertNotSame('products/goc.webp', $media[0]->file_path);
        Storage::disk('public')->assertExists($media[0]->file_path);
        $this->assertTrue($media[0]->is_primary);
        $this->assertSame($media[0]->file_url, $copy->thumbnail_url);
        $this->assertSame('https://cdn.example.com/a.jpg', $media[1]->file_url);

        // Xóa ảnh ở bản sao không làm mất file của bản gốc
        $this->as($this->admin)->deleteJson("/api/admin/products/{$copy->id}/images/{$media[0]->id}")->assertOk();
        Storage::disk('public')->assertExists('products/goc.webp');
        Storage::disk('public')->assertMissing($media[0]->file_path);
        $this->assertSame(2, ProductMedia::where('product_id', $p->id)->count());
    }
}
