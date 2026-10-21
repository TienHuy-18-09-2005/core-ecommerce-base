<?php

namespace Tests\Feature;

use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Shop\GuestCartToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthAccountTest extends TestCase
{
    use RefreshDatabase;

    private const SPA = 'http://localhost:5173';

    // ---------- 4.2 / 4.3 login ----------

    public function test_login_starts_a_session_and_returns_public_user_fields(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com', 'password' => Hash::make('Secret123')]);

        $res = $this->spa()->postJson('/api/auth/login', ['email' => 'A@example.com', 'password' => 'Secret123'])->assertOk();

        $res->assertJsonPath('data.user.id', $user->id)->assertJsonPath('data.user.email', 'a@example.com');
        $this->assertStringNotContainsString('password', $res->getContent());
        $this->assertStringNotContainsString('remember_token', $res->getContent());
        $this->assertAuthenticatedAs($user, 'web');
        $this->spa()->getJson('/api/user')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_wrong_password_unknown_email_and_disabled_account_share_one_generic_error(): void
    {
        User::factory()->create(['email' => 'a@example.com', 'password' => Hash::make('Secret123')]);
        User::factory()->create(['email' => 'off@example.com', 'password' => Hash::make('Secret123'), 'is_active' => false]);

        $bodies = [];
        foreach ([['a@example.com', 'sai'], ['khongco@example.com', 'Secret123'], ['off@example.com', 'Secret123']] as [$email, $pw]) {
            $bodies[] = $this->spa()->postJson('/api/auth/login', ['email' => $email, 'password' => $pw])
                ->assertStatus(422)
                ->assertJsonPath('code', DomainException::INVALID_CREDENTIALS)
                ->assertJsonPath('message', 'Email hoặc mật khẩu không đúng.')
                ->json();
        }

        $this->assertCount(1, array_unique(array_map('json_encode', $bodies)));
        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited_to_five_per_minute(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->spa()->postJson('/api/auth/login', ['email' => 'x@example.com', 'password' => 'sai'])->assertStatus(422);
        }

        $this->spa()->postJson('/api/auth/login', ['email' => 'x@example.com', 'password' => 'sai'])
            ->assertStatus(429)->assertJsonPath('code', 'TOO_MANY_REQUESTS');
    }

    public function test_logout_ends_the_session(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Secret123')]);
        $this->spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Secret123'])->assertOk();

        $this->spa()->postJson('/api/auth/logout')->assertOk();

        $this->assertGuest('web');
        $this->app['auth']->forgetGuards();
        $this->spa()->getJson('/api/user')->assertUnauthorized();
    }

    // ---------- 4.4 register ----------

    public function test_register_creates_a_customer_and_logs_in(): void
    {
        $res = $this->spa()->postJson('/api/auth/register', [
            'name' => 'Khách Mới',
            'email' => 'Moi@Example.com',
            'phone' => '+84912345678',
            'password' => 'Matkhau123',
            'password_confirmation' => 'Matkhau123',
            'role' => 'admin',
        ])->assertCreated();

        $res->assertJsonPath('data.user.role', 'customer')->assertJsonPath('data.user.phone', '0912345678');
        $this->assertDatabaseHas('users', ['email' => 'moi@example.com', 'role' => 'customer']);
        $this->assertAuthenticated('web');
    }

    public function test_register_validation(): void
    {
        User::factory()->create(['email' => 'trung@example.com']);

        $this->spa()->postJson('/api/auth/register', [
            'name' => '',
            'email' => 'trung@example.com',
            'phone' => '123',
            'password' => 'ngan',
            'password_confirmation' => 'khac',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'phone', 'password'])
            ->assertJsonPath('errors.email.0', 'Email này đã được đăng ký.');
    }

    // ---------- 4.8 merge cart on login ----------

    public function test_login_merges_the_guest_cart_clamps_stock_reports_adjustments_and_clears_cookie(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Secret123')]);
        $a = $this->makeVariant(stock: 3);
        $b = $this->makeVariant(stock: 5);
        $userCart = Cart::create(['user_id' => $user->id]);
        CartItem::create(['cart_id' => $userCart->id, 'product_variant_id' => $a->id, 'quantity' => 2]);

        $token = Str::random(40);
        $guest = Cart::create(['session_id' => hash('sha256', $token)]);
        CartItem::create(['cart_id' => $guest->id, 'product_variant_id' => $a->id, 'quantity' => 2]);
        CartItem::create(['cart_id' => $guest->id, 'product_variant_id' => $b->id, 'quantity' => 1]);

        $res = $this->spa()->withUnencryptedCookie(GuestCartToken::COOKIE_NAME, $token)
            ->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Secret123'])
            ->assertOk();

        $res->assertJsonPath('data.cart_adjustments.0.product_variant_id', $a->id)
            ->assertJsonPath('data.cart_adjustments.0.requested', 4)
            ->assertJsonPath('data.cart_adjustments.0.quantity', 3)
            ->assertJsonPath('data.cart_adjustments.0.reason', 'INSUFFICIENT_STOCK')
            ->assertJsonPath('data.cart_adjustments.0.product_name', $a->product->name);
        $this->assertSame(3, CartItem::where('cart_id', $userCart->id)->where('product_variant_id', $a->id)->value('quantity'));
        $this->assertSame(1, CartItem::where('cart_id', $userCart->id)->where('product_variant_id', $b->id)->value('quantity'));
        $this->assertDatabaseMissing('carts', ['id' => $guest->id]);

        $cookie = $res->getCookie(GuestCartToken::COOKIE_NAME, false);
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isCleared());
    }

    public function test_login_without_guest_cart_has_no_adjustments(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Secret123')]);

        $this->spa()->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'Secret123'])
            ->assertOk()->assertJsonPath('data.cart_adjustments', []);
    }

    // ---------- 4.5 account ----------

    public function test_account_routes_require_authentication(): void
    {
        foreach (['/api/user/orders', '/api/user/addresses'] as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
        $this->putJson('/api/user/profile', ['name' => 'x'])->assertUnauthorized();
    }

    public function test_profile_update_cannot_change_role_or_email(): void
    {
        $user = User::factory()->create(['email' => 'a@example.com']);

        $this->actingAs($user)->putJson('/api/user/profile', [
            'name' => 'Tên Mới', 'phone' => '0987654321', 'role' => 'admin', 'email' => 'hack@example.com',
        ])->assertOk()->assertJsonPath('data.name', 'Tên Mới');

        $user->refresh();
        $this->assertSame('customer', $user->role);
        $this->assertSame('a@example.com', $user->email);
        $this->assertSame('0987654321', $user->phone);
    }

    public function test_change_password_requires_the_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('Cu123456')]);

        $this->actingAs($user)->putJson('/api/user/password', [
            'current_password' => 'sai', 'password' => 'Moi123456', 'password_confirmation' => 'Moi123456',
        ])->assertStatus(422)->assertJsonPath('code', DomainException::WRONG_PASSWORD);

        $this->actingAs($user)->putJson('/api/user/password', [
            'current_password' => 'Cu123456', 'password' => 'Moi123456', 'password_confirmation' => 'Moi123456',
        ])->assertOk();

        $this->assertTrue(Hash::check('Moi123456', $user->fresh()->password));
    }

    public function test_order_history_only_lists_own_orders_with_timeline_fields(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $mine = $this->makeOrder($me, ['status' => 'confirmed', 'confirmed_at' => now()]);
        $this->makeOrder($other);

        $res = $this->actingAs($me)->getJson('/api/user/orders')->assertOk();

        $res->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.order_code', $mine->order_code)
            ->assertJsonPath('data.0.status', 'confirmed')
            ->assertJsonPath('meta.total', 1);
        $this->assertNotNull($res->json('data.0.confirmed_at'));
    }

    public function test_address_book_crud_is_scoped_to_the_owner_and_keeps_one_default(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $payload = ['recipient_name' => 'A', 'recipient_phone' => '0900000000', 'province' => 'Thành phố Hồ Chí Minh', 'district' => 'Quận 1', 'ward' => 'Bến Nghé', 'street_address' => '1 Lê Lợi'];

        $first = $this->actingAs($me)->postJson('/api/user/addresses', $payload)->assertCreated()->json('data');
        $this->assertTrue($first['is_default']);
        $second = $this->actingAs($me)->postJson('/api/user/addresses', $payload + ['is_default' => true])->assertCreated()->json('data');

        $list = $this->actingAs($me)->getJson('/api/user/addresses')->assertOk()->json('data');
        $this->assertSame([$second['id']], array_column(array_filter($list, fn ($a) => $a['is_default']), 'id'));

        $this->actingAs($other)->putJson("/api/user/addresses/{$first['id']}", $payload)->assertNotFound();
        $this->actingAs($other)->deleteJson("/api/user/addresses/{$first['id']}")->assertNotFound();

        $this->actingAs($me)->deleteJson("/api/user/addresses/{$second['id']}")->assertOk();
        $this->assertTrue((bool) $me->addresses()->find($first['id'])->is_default);

        $this->actingAs($me)->postJson('/api/user/addresses', ['recipient_phone' => '1'] + $payload)
            ->assertStatus(422)->assertJsonValidationErrors(['recipient_phone']);
    }

    // ---------- helpers ----------

    private function spa(): static
    {
        return $this->withCredentials()->withHeader('Origin', self::SPA)->withHeader('Referer', self::SPA.'/');
    }

    private function makeVariant(int $stock): ProductVariant
    {
        $product = Product::create(['name' => 'Đèn '.Str::random(4), 'slug' => 'den-'.Str::random(8), 'status' => 'published']);

        return ProductVariant::create([
            'product_id' => $product->id, 'sku' => 'SKU-'.Str::random(8), 'name' => 'Mặc định',
            'price' => 100000, 'stock_quantity' => $stock, 'is_default' => true, 'is_active' => true,
        ]);
    }

    private function makeOrder(User $user, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'order_code' => 'ORD-'.strtoupper(Str::random(10)),
            'user_id' => $user->id,
            'customer_name' => 'A', 'customer_phone' => '0900000000',
            'shipping_province' => 'HN', 'shipping_district' => 'BĐ', 'shipping_ward' => 'ĐB', 'shipping_address' => '1',
            'subtotal' => 100000, 'shipping_fee' => 30000, 'total_amount' => 130000,
        ], $overrides));
    }
}
