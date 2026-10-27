<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use App\Services\Shop\GuestCartToken;
use App\Services\Support\ShopSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

/** R7: cài đặt cửa hàng (thông tin, phí ship, ngưỡng miễn phí) + đổi mật khẩu quản trị. */
class AdminSettingsR7Test extends TestCase
{
    use RefreshDatabase;

    private const NEW_PW = 'Moi@Matkhau2026';

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'password' => Hash::make('Cu@Matkhau2026')]);
    }

    private function as(User $user): static
    {
        $this->app['auth']->forgetGuards(); // đổi user giữa các request trong cùng test

        return $this->withHeader('Origin', 'http://localhost:5173')->withCredentials()->actingAs($user);
    }

    private function staff(string ...$slugs): User
    {
        $u = User::factory()->create(['role' => 'staff', 'password' => Hash::make('Cu@Matkhau2026')]);
        $u->roles()->sync(Role::whereIn('slug', $slugs)->pluck('id'));

        return $u;
    }

    private function cart(int $price, int $qty = 1): string
    {
        $p = Product::create(['name' => 'Đèn '.Str::random(4), 'slug' => 'den-'.Str::random(8), 'status' => 'published']);
        $v = ProductVariant::create(['product_id' => $p->id, 'sku' => 'SKU-'.Str::random(8), 'name' => 'M', 'price' => $price, 'cost_price' => 1, 'stock_quantity' => 10, 'is_default' => true, 'is_active' => true]);
        $token = Str::random(40);
        $cart = Cart::create(['session_id' => hash('sha256', $token)]);
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => $v->id, 'quantity' => $qty]);

        return $token;
    }

    private function guest(string $token): static
    {
        return $this->withCredentials()->withUnencryptedCookie(GuestCartToken::COOKIE_NAME, $token);
    }

    public function test_defaults_come_from_config_and_store_name_default(): void
    {
        $s = app(ShopSettings::class)->all();
        $this->assertSame('Đồ Điện Siêu Xịn', $s['store_name']);
        $this->assertSame(30000, $s['shipping_fee']);
        $this->getJson('/api/settings/public')->assertOk()
            ->assertJsonPath('data.store.name', 'Đồ Điện Siêu Xịn')
            ->assertJsonPath('data.shipping.fee', 30000)
            ->assertJsonPath('data.shipping.free_threshold', null);
    }

    public function test_admin_updates_settings_with_validation_audit_and_cache_flush(): void
    {
        app(ShopSettings::class)->all(); // nạp cache
        $this->as($this->admin)->putJson('/api/admin/settings', ['store_phone' => 'abc', 'shipping_fee' => -1, 'store_email' => 'khong-phai-email'])
            ->assertStatus(422)->assertJsonValidationErrors(['store_phone', 'shipping_fee', 'store_email']);

        $this->as($this->admin)->putJson('/api/admin/settings', [
            'store_name' => '  Đồ Điện ABC ', 'store_phone' => '0281 234 567', 'store_address' => '12 Lê Lợi, Q1', 'store_email' => ' lienhe@dodien.vn ',
            'shipping_fee' => 25000, 'free_shipping_threshold' => 500000,
        ])->assertOk()->assertJsonPath('data.store_name', 'Đồ Điện ABC')->assertJsonPath('data.free_shipping_threshold', 500000);

        $this->getJson('/api/settings/public')->assertJsonPath('data.shipping.fee', 25000)->assertJsonPath('data.store.phone', '0281 234 567')->assertJsonPath('data.store.email', 'lienhe@dodien.vn');
        $log = AdminAuditLog::where('action', 'settings.updated')->firstOrFail();
        $this->assertSame([30000, 25000], $log->changes['shipping_fee']);
        $this->assertTrue(Cache::has(ShopSettings::CACHE_KEY));
    }

    public function test_cart_preview_and_checkout_use_settings_fee_and_free_threshold(): void
    {
        app(ShopSettings::class)->update(['shipping_fee' => 15000, 'free_shipping_threshold' => 200000]);

        $small = $this->cart(100000);
        $this->guest($small)->getJson('/api/cart')->assertOk()
            ->assertJsonPath('data.summary.shipping_fee', 15000)
            ->assertJsonPath('data.summary.total', 115000)
            ->assertJsonPath('data.summary.free_shipping_remaining', 100000);

        $big = $this->cart(100000, 2);
        $this->guest($big)->getJson('/api/cart')->assertJsonPath('data.summary.shipping_fee', 0)->assertJsonPath('data.summary.total', 200000);

        $this->guest($big)->withHeader('Idempotency-Key', (string) Str::uuid())->postJson('/api/checkout', [
            'customer_name' => 'Nguyễn A', 'customer_phone' => '0900000000', 'customer_email' => 'a@example.com',
            'shipping_province' => 'Hà Nội', 'shipping_district' => 'Ba Đình', 'shipping_ward' => 'Điện Biên', 'shipping_address' => '1 Test',
            'payment_method' => 'cod',
        ])->assertCreated();
        $o = Order::latest('id')->first();
        $this->assertEquals(0, $o->shipping_fee);
        $this->assertEquals(200000, $o->total_amount);

        $this->guest($small)->withHeader('Idempotency-Key', (string) Str::uuid())->postJson('/api/checkout', [
            'customer_name' => 'Nguyễn A', 'customer_phone' => '0900000000', 'customer_email' => 'a@example.com',
            'shipping_province' => 'Hà Nội', 'shipping_district' => 'Ba Đình', 'shipping_ward' => 'Điện Biên', 'shipping_address' => '1 Test',
            'payment_method' => 'cod',
        ])->assertCreated();
        $this->assertEquals(15000, Order::latest('id')->first()->shipping_fee);
    }

    public function test_print_slip_uses_store_settings(): void
    {
        app(ShopSettings::class)->update(['store_name' => 'Đồ Điện In', 'store_address' => '99 Hai Bà Trưng', 'store_email' => 'in@dodien.vn']);
        $o = Order::create(['order_code' => 'ORD-R7PRINT', 'customer_name' => 'A', 'customer_phone' => '0900000000',
            'shipping_province' => 'HN', 'shipping_district' => 'BĐ', 'shipping_ward' => 'ĐB', 'shipping_address' => '1',
            'subtotal' => 1, 'discount_amount' => 0, 'shipping_fee' => 0, 'total_amount' => 1, 'payment_method' => 'cod', 'payment_status' => 'unpaid', 'status' => 'pending']);
        $this->as($this->admin)->getJson('/api/admin/orders/print?ids[]='.$o->id)->assertOk()
            ->assertJsonPath('data.store.name', 'Đồ Điện In')->assertJsonPath('data.store.address', '99 Hai Bà Trưng')->assertJsonPath('data.store.email', 'in@dodien.vn');
    }

    public function test_store_email_falls_back_to_config(): void
    {
        config(['store.email' => 'hotro@config.vn']);
        app(ShopSettings::class)->flush();
        $this->getJson('/api/settings/public')->assertJsonPath('data.store.email', 'hotro@config.vn');
        app(ShopSettings::class)->update(['store_email' => 'db@dodien.vn']);
        $this->getJson('/api/settings/public')->assertJsonPath('data.store.email', 'db@dodien.vn');
    }

    public function test_settings_permissions(): void
    {
        $staff = $this->staff('accountant');
        $this->as($staff)->getJson('/api/admin/settings')->assertForbidden();
        $this->as($staff)->putJson('/api/admin/settings', ['shipping_fee' => 1])->assertForbidden();

        $viewer = Role::create(['slug' => 'xem-cai-dat', 'name' => 'Xem cài đặt']);
        $viewer->permissions()->sync(\App\Models\Permission::whereIn('key', ['dashboard.view', 'settings.view'])->pluck('id'));
        $staff->roles()->attach($viewer->id);
        app(\App\Services\Admin\PermissionService::class)->forget($staff->id);
        $this->as($staff->fresh())->getJson('/api/admin/settings')->assertOk();
        $this->as($staff->fresh())->putJson('/api/admin/settings', ['shipping_fee' => 1])->assertForbidden();
    }

    public function test_admin_reads_settings_with_defaults(): void
    {
        $this->as($this->admin)->getJson('/api/admin/settings')->assertOk()->assertJsonPath('data.defaults.store_name', 'Đồ Điện Siêu Xịn');
    }

    public function test_change_password_flows(): void
    {
        $staff = $this->staff('customer_care');
        // sai mật khẩu hiện tại
        $this->as($staff)->putJson('/api/admin/account/password', ['current_password' => 'sai', 'password' => self::NEW_PW, 'password_confirmation' => self::NEW_PW])
            ->assertStatus(422);
        // yếu / không khớp
        $this->as($staff)->putJson('/api/admin/account/password', ['current_password' => 'Cu@Matkhau2026', 'password' => 'abc12345', 'password_confirmation' => 'abc12345'])
            ->assertStatus(422)->assertJsonValidationErrors('password');
        $this->as($staff)->putJson('/api/admin/account/password', ['current_password' => 'Cu@Matkhau2026', 'password' => self::NEW_PW, 'password_confirmation' => 'Khac@2026xx'])
            ->assertStatus(422)->assertJsonValidationErrors('password');

        $staff->createToken('khac');
        $this->as($staff)->putJson('/api/admin/account/password', ['current_password' => 'Cu@Matkhau2026', 'password' => self::NEW_PW, 'password_confirmation' => self::NEW_PW])
            ->assertOk();
        $this->assertTrue(Hash::check(self::NEW_PW, $staff->fresh()->password));
        $this->assertSame(0, $staff->tokens()->count());

        $log = AdminAuditLog::where('action', 'account.password_changed')->firstOrFail();
        $this->assertSame($staff->id, $log->user_id);
        $this->assertStringNotContainsString(self::NEW_PW, json_encode($log->toArray()));
        $this->assertStringNotContainsString('Cu@Matkhau', json_encode($log->toArray()));
    }

    public function test_customer_cannot_use_admin_password_endpoint(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $this->as($customer)->putJson('/api/admin/account/password', [])->assertForbidden();
    }

    public function test_change_password_is_rate_limited_and_needs_admin_access(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->as($this->admin)->putJson('/api/admin/account/password', ['current_password' => 'sai', 'password' => self::NEW_PW, 'password_confirmation' => self::NEW_PW]);
        }
        $this->as($this->admin)->putJson('/api/admin/account/password', ['current_password' => 'sai', 'password' => self::NEW_PW, 'password_confirmation' => self::NEW_PW])
            ->assertStatus(429);
    }
}
