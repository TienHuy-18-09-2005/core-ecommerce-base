<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Repositories\Contracts\CartRepositoryInterface;
use App\Services\Shop\CartService;
use App\Services\Shop\GuestCartToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class GuestCartTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_request_without_cookie_receives_an_httponly_token_and_an_empty_cart(): void
    {
        $response = $this->withCredentials()->getJson('/api/cart');

        $response->assertOk()->assertJsonPath('success', true)->assertJsonPath('data.items', []);

        $cookie = $response->getCookie(GuestCartToken::COOKIE_NAME, false);
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
        $this->assertFalse($cookie->isSecure());

        $token = $cookie->getValue();
        $this->assertMatchesRegularExpression('/\A[A-Za-z0-9]{40}\z/', $token);
        $this->assertStringNotContainsString(hash('sha256', $token), $response->getContent());

        $this->assertDatabaseHas('carts', [
            'id' => $response->json('data.id'),
            'user_id' => null,
            'session_id' => hash('sha256', $token),
        ]);
        $this->assertDatabaseMissing('carts', ['session_id' => $token]);
        $this->assertSame(0, Cart::query()->whereNull('user_id')->whereNull('session_id')->count());
    }

    public function test_same_cookie_returns_the_same_cart(): void
    {
        $first = $this->withCredentials()->getJson('/api/cart')->assertOk();
        $token = $first->getCookie(GuestCartToken::COOKIE_NAME, false)->getValue();

        $second = $this->withCartToken($token)->getJson('/api/cart')->assertOk();

        $this->assertSame($first->json('data.id'), $second->json('data.id'));
        $this->assertNull($second->getCookie(GuestCartToken::COOKIE_NAME, false));
    }

    public function test_client_cannot_read_another_cart_by_header_body_or_guessed_hash(): void
    {
        $variant = $this->makeVariant();
        $victimToken = Str::random(40);
        $victim = Cart::create([
            'user_id' => null,
            'session_id' => hash('sha256', $victimToken),
        ]);
        CartItem::create([
            'cart_id' => $victim->id,
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $byHeader = $this->withCredentials()
            ->withHeader('X-Session-ID', $victimToken)
            ->getJson('/api/cart')
            ->assertOk();

        $this->assertNotSame($victim->id, $byHeader->json('data.id'));
        $this->assertSame([], $byHeader->json('data.items'));

        $byBody = $this->withCredentials()
            ->postJson('/api/cart', [
                'product_variant_id' => $variant->id,
                'quantity' => 1,
                'session_id' => $victimToken,
            ])
            ->assertOk();

        $this->assertNotSame($victim->id, $byBody->json('data.id'));
        $this->assertSame(2, CartItem::query()->where('cart_id', $victim->id)->value('quantity'));

        $byHash = $this->withCartToken(hash('sha256', $victimToken))
            ->getJson('/api/cart')
            ->assertOk();

        $this->assertNotSame($victim->id, $byHash->json('data.id'));
        $this->assertSame([], $byHash->json('data.items'));
        $this->assertSame(0, Cart::query()->whereNull('user_id')->whereNull('session_id')->count());
    }

    public function test_client_cannot_change_another_cart_item_by_guessing_its_id(): void
    {
        $variant = $this->makeVariant();
        $victimToken = Str::random(40);
        $victim = Cart::create([
            'user_id' => null,
            'session_id' => hash('sha256', $victimToken),
        ]);
        $item = CartItem::create([
            'cart_id' => $victim->id,
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        $attacker = $this->withCredentials()->getJson('/api/cart')->assertOk();
        $attackerToken = $attacker->getCookie(GuestCartToken::COOKIE_NAME, false)->getValue();

        $this->withCartToken($attackerToken)
            ->putJson('/api/cart/'.$item->id, ['quantity' => 9])
            ->assertStatus(400);

        $this->withCartToken($attackerToken)
            ->deleteJson('/api/cart/'.$item->id)
            ->assertOk();

        $this->assertSame(2, $item->fresh()->quantity);
        $this->assertNotNull(CartItem::query()->find($item->id));
    }

    public function test_logged_in_cart_is_not_replaced_by_a_guest_cookie(): void
    {
        $user = User::factory()->create();
        $variant = $this->makeVariant();
        $userCart = Cart::create(['user_id' => $user->id, 'session_id' => null]);

        $guestToken = Str::random(40);
        $guestCart = Cart::create([
            'user_id' => null,
            'session_id' => hash('sha256', $guestToken),
        ]);
        CartItem::create([
            'cart_id' => $guestCart->id,
            'product_variant_id' => $variant->id,
            'quantity' => 3,
        ]);

        $response = $this->actingAs($user)
            ->withHeader('Origin', 'http://localhost:5173')
            ->withCartToken($guestToken)
            ->getJson('/api/cart')
            ->assertOk();

        $this->assertSame($userCart->id, $response->json('data.id'));
        $this->assertSame([], $response->json('data.items'));
        $this->assertSame(3, CartItem::query()->where('cart_id', $guestCart->id)->value('quantity'));
    }

    public function test_checkout_uses_the_cart_cookie_and_ignores_the_session_header(): void
    {
        $variant = $this->makeVariant(5);
        $token = Str::random(40);
        $cart = Cart::create([
            'user_id' => null,
            'session_id' => hash('sha256', $token),
        ]);
        CartItem::create([
            'cart_id' => $cart->id,
            'product_variant_id' => $variant->id,
            'quantity' => 1,
        ]);

        $otherVariant = $this->makeVariant(5);
        $other = Cart::create([
            'user_id' => null,
            'session_id' => 'forged-header-value',
        ]);
        CartItem::create([
            'cart_id' => $other->id,
            'product_variant_id' => $otherVariant->id,
            'quantity' => 1,
        ]);

        $this->withCartToken($token)
            ->withHeader('X-Session-ID', 'forged-header-value')
            ->postJson('/api/checkout', $this->checkoutPayload())
            ->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('carts', ['id' => $cart->id]);
        $this->assertDatabaseHas('carts', ['id' => $other->id]);
        $this->assertSame(4, $variant->fresh()->stock_quantity);
        $this->assertSame(5, $otherVariant->fresh()->stock_quantity);
    }

    public function test_repository_refuses_to_create_a_cart_without_an_owner(): void
    {
        $repository = app(CartRepositoryInterface::class);

        try {
            $repository->findOrCreateCart(null, null);
            $this->fail('Expected a cart without an owner to be rejected.');
        } catch (\InvalidArgumentException $e) {
            $this->assertSame(0, Cart::query()->count());
        }

        try {
            $repository->findOrCreateCart(null, '');
            $this->fail('Expected an empty session id to be rejected.');
        } catch (\InvalidArgumentException) {
            $this->assertSame(0, Cart::query()->count());
        }
    }

    public function test_merge_looks_up_the_guest_cart_by_token_hash(): void
    {
        $user = User::factory()->create();
        $token = Str::random(40);
        $variant = $this->makeVariant();
        $guest = Cart::create([
            'user_id' => null,
            'session_id' => hash('sha256', $token),
        ]);
        CartItem::create([
            'cart_id' => $guest->id,
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

        app(CartService::class)->mergeGuestCartToUser($token, $user->id);

        $this->assertDatabaseMissing('carts', ['id' => $guest->id]);
        $userCart = Cart::query()->where('user_id', $user->id)->first();
        $this->assertNotNull($userCart);
        $this->assertNull($userCart->session_id);
        $this->assertSame(2, $userCart->items()->first()->quantity);
    }

    public function test_cart_cookie_is_secure_when_session_cookies_are_secure(): void
    {
        config(['session.secure' => true]);

        $cookie = $this->withCredentials()
            ->getJson('/api/cart')
            ->getCookie(GuestCartToken::COOKIE_NAME, false);

        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isSecure());
        $this->assertTrue($cookie->isHttpOnly());
    }

    public function test_cart_cookie_is_secure_in_production_when_the_flag_is_unset(): void
    {
        config(['session.secure' => null]);
        $this->app['env'] = 'production';

        $cookie = $this->withCredentials()
            ->getJson('/api/cart')
            ->getCookie(GuestCartToken::COOKIE_NAME, false);

        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isSecure());
    }

    private function withCartToken(string $token): static
    {
        return $this->withCredentials()->withUnencryptedCookie(GuestCartToken::COOKIE_NAME, $token);
    }

    private function makeVariant(int $stock = 10): ProductVariant
    {
        $product = Product::create([
            'name' => 'Đèn test',
            'slug' => 'den-test-'.Str::random(8),
            'status' => 'published',
        ]);

        return ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-'.Str::random(8),
            'name' => 'Mặc định',
            'price' => 100000,
            'stock_quantity' => $stock,
            'is_default' => true,
            'is_active' => true,
        ]);
    }

    private function checkoutPayload(): array
    {
        return [
            'customer_name' => 'Nguyễn A',
            'customer_phone' => '0900000000',
            'customer_email' => 'a@example.com',
            'shipping_province' => 'Hà Nội',
            'shipping_district' => 'Ba Đình',
            'shipping_ward' => 'Điện Biên',
            'shipping_address' => '1 Test',
            'payment_method' => 'cod',
        ];
    }
}
