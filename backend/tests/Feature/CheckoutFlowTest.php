<?php

namespace Tests\Feature;

use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\Shop\CartService;
use App\Services\Shop\CouponService;
use App\Services\Shop\GuestCartToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CheckoutFlowTest extends TestCase
{
    use RefreshDatabase;

    // ---------- 3.A giỏ hàng ----------

    public function test_cart_response_has_server_computed_lines_and_summary_without_internal_fields(): void
    {
        $variant = $this->makeVariant(stock: 5, price: 120000);
        $token = $this->guestCartWith($variant, 2);

        $res = $this->withCartToken($token)->getJson('/api/cart')->assertOk();

        $res->assertJsonPath('data.items.0.product_name', $variant->product->name)
            ->assertJsonPath('data.items.0.unit_price', 120000)
            ->assertJsonPath('data.items.0.line_total', 240000)
            ->assertJsonPath('data.items.0.warning', null)
            ->assertJsonPath('data.summary.item_count', 2)
            ->assertJsonPath('data.summary.subtotal', 240000)
            ->assertJsonPath('data.summary.shipping_fee', 30000)
            ->assertJsonPath('data.summary.total', 270000)
            ->assertJsonPath('data.summary.has_issues', false);

        $this->assertStringNotContainsString('cost_price', $res->getContent());
        $this->assertStringNotContainsString('session_id', $res->getContent());
    }

    public function test_cart_flags_out_of_stock_and_inactive_lines_and_excludes_them_from_subtotal(): void
    {
        $ok = $this->makeVariant(stock: 5, price: 100000);
        $short = $this->makeVariant(stock: 1, price: 50000);
        $off = $this->makeVariant(stock: 5, price: 70000);
        $token = $this->guestCartWith($ok, 1);
        $cart = Cart::where('session_id', hash('sha256', $token))->first();
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => $short->id, 'quantity' => 3]);
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => $off->id, 'quantity' => 1]);
        $off->update(['is_active' => false]);

        $res = $this->withCartToken($token)->getJson('/api/cart')->assertOk();

        $warnings = collect($res->json('data.items'))->pluck('warning', 'product_variant_id');
        $this->assertNull($warnings[$ok->id]);
        $this->assertSame('INSUFFICIENT_STOCK', $warnings[$short->id]);
        $this->assertSame('UNAVAILABLE', $warnings[$off->id]);
        $res->assertJsonPath('data.summary.subtotal', 100000)->assertJsonPath('data.summary.has_issues', true);
    }

    public function test_update_cart_item_uses_form_request_validation(): void
    {
        $variant = $this->makeVariant();
        $token = $this->guestCartWith($variant, 1);
        $itemId = CartItem::first()->id;

        $this->withCartToken($token)->putJson("/api/cart/{$itemId}", ['quantity' => 'abc'])
            ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_ERROR');
        $this->withCartToken($token)->putJson("/api/cart/{$itemId}", [])
            ->assertStatus(422)->assertJsonPath('errors.quantity.0', fn ($m) => is_string($m));

        $this->withCartToken($token)->putJson("/api/cart/{$itemId}", ['quantity' => 3])
            ->assertOk()->assertJsonPath('data.items.0.quantity', 3);
        $this->withCartToken($token)->putJson("/api/cart/{$itemId}", ['quantity' => 0])
            ->assertOk()->assertJsonPath('data.items', []);
    }

    public function test_cannot_add_inactive_or_unpublished_variant(): void
    {
        $variant = $this->makeVariant();
        $variant->update(['is_active' => false]);

        $this->withCredentials()->postJson('/api/cart', ['product_variant_id' => $variant->id, 'quantity' => 1])
            ->assertStatus(422)->assertJsonPath('code', DomainException::PRODUCT_UNAVAILABLE);

        $this->withCredentials()->postJson('/api/cart', ['product_variant_id' => 999999, 'quantity' => 1])
            ->assertStatus(422)->assertJsonPath('code', DomainException::PRODUCT_UNAVAILABLE);
    }

    public function test_merge_guest_cart_clamps_to_stock_drops_inactive_and_deletes_guest_cart(): void
    {
        $user = User::factory()->create();
        $a = $this->makeVariant(stock: 3);
        $b = $this->makeVariant(stock: 5);
        $userCart = Cart::create(['user_id' => $user->id]);
        CartItem::create(['cart_id' => $userCart->id, 'product_variant_id' => $a->id, 'quantity' => 2]);

        $token = Str::random(40);
        $guest = Cart::create(['session_id' => hash('sha256', $token)]);
        CartItem::create(['cart_id' => $guest->id, 'product_variant_id' => $a->id, 'quantity' => 2]);
        CartItem::create(['cart_id' => $guest->id, 'product_variant_id' => $b->id, 'quantity' => 1]);
        $b->update(['is_active' => false]);

        $result = app(CartService::class)->mergeGuestCartToUser($token, $user->id);

        $this->assertSame(3, CartItem::where('cart_id', $userCart->id)->where('product_variant_id', $a->id)->value('quantity'));
        $this->assertFalse(CartItem::where('cart_id', $userCart->id)->where('product_variant_id', $b->id)->exists());
        $reasons = collect($result['adjustments'])->pluck('reason', 'product_variant_id');
        $this->assertSame('INSUFFICIENT_STOCK', $reasons[$a->id]);
        $this->assertSame('UNAVAILABLE', $reasons[$b->id]);
        $this->assertDatabaseMissing('carts', ['id' => $guest->id]);
    }

    public function test_prune_command_removes_only_expired_guest_carts(): void
    {
        $user = User::factory()->create();
        $old = Cart::create(['session_id' => hash('sha256', Str::random(40))]);
        $fresh = Cart::create(['session_id' => hash('sha256', Str::random(40))]);
        $userCart = Cart::create(['user_id' => $user->id]);
        Cart::whereIn('id', [$old->id, $userCart->id])->update(['updated_at' => now()->subDays(31)]);

        $this->artisan('carts:prune-guests')->assertSuccessful();

        $this->assertDatabaseMissing('carts', ['id' => $old->id]);
        $this->assertDatabaseHas('carts', ['id' => $fresh->id]);
        $this->assertDatabaseHas('carts', ['id' => $userCart->id]);
    }

    // ---------- 3.B checkout ----------

    public function test_checkout_requires_idempotency_key_vn_phone_and_cod(): void
    {
        $token = $this->guestCartWith($this->makeVariant(), 1);

        $this->withCartToken($token)->postJson('/api/checkout', $this->payload())
            ->assertStatus(422)->assertJsonValidationErrors(['idempotency_key']);

        $res = $this->checkout($token, $this->payload(['customer_phone' => '12345', 'payment_method' => 'vnpay']));
        $res->assertStatus(422)->assertJsonValidationErrors(['customer_phone', 'payment_method']);
        $this->assertSame(0, Order::count());
    }

    public function test_same_idempotency_key_creates_only_one_order(): void
    {
        $variant = $this->makeVariant(stock: 5, price: 100000);
        $token = $this->guestCartWith($variant, 2);
        $key = (string) Str::uuid();

        $first = $this->checkout($token, $this->payload(), $key)->assertCreated();
        $first->assertJsonPath('meta.replayed', false)
            ->assertJsonPath('data.subtotal', 200000)
            ->assertJsonPath('data.shipping_fee', 30000)
            ->assertJsonPath('data.total_amount', 230000);

        $retry = $this->checkout($token, $this->payload(), $key)->assertOk();
        $retry->assertJsonPath('meta.replayed', true)
            ->assertJsonPath('data.order_code', $first->json('data.order_code'));

        $this->assertSame(1, Order::count());
        $this->assertSame(3, $variant->fresh()->stock_quantity);
        $this->assertStringNotContainsString('idempotency', $first->getContent());
    }

    public function test_client_supplied_prices_are_ignored(): void
    {
        $token = $this->guestCartWith($this->makeVariant(price: 100000), 1);

        $this->checkout($token, $this->payload(['total_amount' => 1, 'subtotal' => 1, 'shipping_fee' => 0]))
            ->assertCreated()->assertJsonPath('data.total_amount', 130000);
    }

    public function test_last_unit_can_only_be_sold_once(): void
    {
        $variant = $this->makeVariant(stock: 1);
        $tokenA = $this->guestCartWith($variant, 1);
        $tokenB = $this->guestCartWith($variant, 1);

        $this->checkout($tokenA, $this->payload())->assertCreated();
        $this->checkout($tokenB, $this->payload())
            ->assertStatus(409)->assertJsonPath('code', DomainException::STOCK_UNAVAILABLE);

        $this->assertSame(0, $variant->fresh()->stock_quantity);
        $this->assertSame(1, Order::count());
    }

    public function test_checkout_rejects_cart_with_inactive_variant(): void
    {
        $variant = $this->makeVariant();
        $token = $this->guestCartWith($variant, 1);
        $variant->update(['is_active' => false]);

        $this->checkout($token, $this->payload())
            ->assertStatus(409)->assertJsonPath('code', DomainException::PRODUCT_UNAVAILABLE);
    }

    public function test_checkout_without_cart_cookie_is_cart_empty(): void
    {
        $this->withCredentials()->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/checkout', $this->payload())
            ->assertStatus(422)->assertJsonPath('code', DomainException::CART_EMPTY);
    }

    // ---------- 3.C coupon ----------

    public function test_unknown_and_expired_coupons_return_the_same_generic_error(): void
    {
        Coupon::create(['code' => 'HETHAN', 'type' => 'fixed', 'value' => 10000, 'expires_at' => now()->subDay()]);
        $token = $this->guestCartWith($this->makeVariant(price: 100000), 1);

        $unknown = $this->withCartToken($token)->postJson('/api/coupons/check', ['code' => 'KHONGCO'])->assertStatus(422);
        $expired = $this->withCartToken($token)->postJson('/api/coupons/check', ['code' => 'HETHAN'])->assertStatus(422);

        $this->assertSame($unknown->json(), $expired->json());
        $unknown->assertJsonPath('code', DomainException::COUPON_INVALID)
            ->assertJsonPath('message', CouponService::INVALID_MESSAGE);

        $this->checkout($token, $this->payload(['coupon_code' => 'KHONGCO']))
            ->assertStatus(422)->assertJsonPath('code', DomainException::COUPON_INVALID);
        $this->assertSame(0, Order::count());
    }

    public function test_coupon_preview_and_checkout_apply_the_same_server_discount(): void
    {
        Coupon::create(['code' => 'GIAM10', 'type' => 'percent', 'value' => 10, 'max_discount_amount' => 15000]);
        $token = $this->guestCartWith($this->makeVariant(price: 100000), 2);

        $this->withCartToken($token)->postJson('/api/coupons/check', ['code' => 'GIAM10'])
            ->assertOk()
            ->assertJsonPath('data.discount_amount', 15000)
            ->assertJsonPath('data.total', 215000);

        $this->checkout($token, $this->payload(['coupon_code' => 'GIAM10']))
            ->assertCreated()
            ->assertJsonPath('data.discount_amount', 15000)
            ->assertJsonPath('data.total_amount', 215000);
        $this->assertSame(1, Coupon::where('code', 'GIAM10')->value('used_count'));
    }

    public function test_fixed_discount_never_exceeds_subtotal(): void
    {
        Coupon::create(['code' => 'TO', 'type' => 'fixed', 'value' => 500000]);
        $token = $this->guestCartWith($this->makeVariant(price: 100000), 1);

        $this->checkout($token, $this->payload(['coupon_code' => 'TO']))
            ->assertCreated()
            ->assertJsonPath('data.discount_amount', 100000)
            ->assertJsonPath('data.total_amount', 30000);
    }

    public function test_usage_limit_and_per_customer_limit_are_enforced(): void
    {
        Coupon::create(['code' => 'MOTLAN', 'type' => 'fixed', 'value' => 10000, 'per_customer_limit' => 1]);
        Coupon::create(['code' => 'HETLUOT', 'type' => 'fixed', 'value' => 10000, 'usage_limit' => 1, 'used_count' => 1]);
        $variant = $this->makeVariant(stock: 10);

        $this->checkout($this->guestCartWith($variant, 1), $this->payload(['coupon_code' => 'MOTLAN']))->assertCreated();
        // Cùng SĐT, giỏ khác → đã dùng hết lượt cho khách này
        $this->checkout($this->guestCartWith($variant, 1), $this->payload(['coupon_code' => 'MOTLAN', 'customer_phone' => '+84900000000']))
            ->assertStatus(422)->assertJsonPath('code', DomainException::COUPON_INVALID);
        $this->checkout($this->guestCartWith($variant, 1), $this->payload(['coupon_code' => 'HETLUOT']))
            ->assertStatus(422)->assertJsonPath('code', DomainException::COUPON_INVALID);
    }

    public function test_min_order_amount_is_enforced(): void
    {
        Coupon::create(['code' => 'DON500', 'type' => 'fixed', 'value' => 10000, 'min_order_amount' => 500000]);
        $token = $this->guestCartWith($this->makeVariant(price: 100000), 1);

        $this->withCartToken($token)->postJson('/api/coupons/check', ['code' => 'DON500'])
            ->assertStatus(422)->assertJsonPath('code', DomainException::COUPON_INVALID);
    }

    // ---------- 3.D tra cứu đơn ----------

    public function test_guest_lookup_requires_matching_phone_and_masks_pii(): void
    {
        $token = $this->guestCartWith($this->makeVariant(), 1);
        $code = $this->checkout($token, $this->payload())->assertCreated()->json('data.order_code');

        $res = $this->postJson('/api/orders/lookup', ['order_code' => $code, 'phone' => '+84900000000'])->assertOk();
        $res->assertJsonPath('data.order_code', $code)
            ->assertJsonPath('data.customer.phone', '090****000')
            ->assertJsonPath('data.customer.name', 'N*** A')
            ->assertJsonPath('data.customer.email', 'a***@example.com')
            ->assertJsonPath('data.shipping.address', null);
        $this->assertStringNotContainsString('1 Test', $res->getContent());

        $wrongPhone = $this->postJson('/api/orders/lookup', ['order_code' => $code, 'phone' => '0911111111'])->assertNotFound();
        $wrongCode = $this->postJson('/api/orders/lookup', ['order_code' => 'ORD-NOPE', 'phone' => '0900000000'])->assertNotFound();
        $this->assertSame($wrongPhone->json(), $wrongCode->json());
        $wrongPhone->assertJsonPath('code', DomainException::ORDER_NOT_FOUND);
    }

    public function test_user_order_detail_is_only_visible_to_its_owner(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $order = $this->makeOrder($owner);

        $this->getJson("/api/user/orders/{$order->order_code}")->assertUnauthorized();
        $this->actingAs($other)->getJson("/api/user/orders/{$order->order_code}")->assertNotFound();
        $this->actingAs($owner)->getJson("/api/user/orders/{$order->order_code}")
            ->assertOk()->assertJsonPath('data.order_code', $order->order_code)
            ->assertJsonPath('data.customer.phone', '0900000000');
    }

    public function test_admin_order_status_uses_route_model_binding(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $this->actingAs($admin)->patchJson('/api/admin/orders/999999/status', ['status' => 'confirmed'])
            ->assertNotFound()->assertJsonPath('code', 'NOT_FOUND');
    }

    public function test_lookup_is_rate_limited_to_five_per_minute(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/orders/lookup', ['order_code' => 'X', 'phone' => '0900000000'])->assertNotFound();
        }

        $this->postJson('/api/orders/lookup', ['order_code' => 'X', 'phone' => '0900000000'])
            ->assertStatus(429)->assertJsonPath('code', 'TOO_MANY_REQUESTS');
    }

    // ---------- helpers ----------

    private function checkout(string $token, array $payload, ?string $key = null)
    {
        return $this->withCartToken($token)
            ->withHeader('Idempotency-Key', $key ?? (string) Str::uuid())
            ->postJson('/api/checkout', $payload);
    }

    private function guestCartWith(ProductVariant $variant, int $qty): string
    {
        $token = Str::random(40);
        $cart = Cart::create(['session_id' => hash('sha256', $token)]);
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => $variant->id, 'quantity' => $qty]);

        return $token;
    }

    private function withCartToken(string $token): static
    {
        return $this->withCredentials()->withUnencryptedCookie(GuestCartToken::COOKIE_NAME, $token);
    }

    private function makeVariant(int $stock = 10, int $price = 100000): ProductVariant
    {
        $product = Product::create(['name' => 'Đèn '.Str::random(4), 'slug' => 'den-'.Str::random(8), 'status' => 'published']);

        return ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-'.Str::random(8),
            'name' => 'Mặc định',
            'price' => $price,
            'cost_price' => 1,
            'stock_quantity' => $stock,
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    private function makeOrder(User $user): Order
    {
        return Order::create([
            'order_code' => 'ORD-'.strtoupper(Str::random(10)),
            'user_id' => $user->id,
            'customer_name' => 'Nguyễn A',
            'customer_phone' => '0900000000',
            'shipping_province' => 'Hà Nội',
            'shipping_district' => 'Ba Đình',
            'shipping_ward' => 'Điện Biên',
            'shipping_address' => '1 Test',
            'subtotal' => 100000,
            'total_amount' => 130000,
            'shipping_fee' => 30000,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'customer_name' => 'Nguyễn A',
            'customer_phone' => '0900000000',
            'customer_email' => 'a@example.com',
            'shipping_province' => 'Hà Nội',
            'shipping_district' => 'Ba Đình',
            'shipping_ward' => 'Điện Biên',
            'shipping_address' => '1 Test',
            'payment_method' => 'cod',
        ], $overrides);
    }
}
