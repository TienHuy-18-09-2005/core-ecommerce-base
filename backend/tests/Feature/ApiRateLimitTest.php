<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class ApiRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_named_limiters_match_the_required_budgets(): void
    {
        $request = Request::create('/api/cart', 'GET');

        $this->assertLimit('login', 5, $request);
        $this->assertLimit('register', 5, $request);
        $this->assertLimit('checkout', 10, $request);
        $this->assertLimit('coupon-check', 10, $request);
        $this->assertLimit('order-lookup', 5, $request);
        $this->assertLimit('cart', 60, $request);
        $this->assertLimit('public-read', 120, $request);
        $this->assertLimit('admin', 60, $request);
    }

    public function test_cart_returns_429_with_retry_after_on_the_61st_request(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/cart')->assertOk();
        }

        $limited = $this->getJson('/api/cart');

        $limited->assertStatus(429);
        $retryAfter = $limited->headers->get('Retry-After');
        $this->assertNotNull($retryAfter);
        $this->assertGreaterThan(0, (int) $retryAfter);
    }

    public function test_checkout_returns_429_on_the_11th_request(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/checkout', [])->assertStatus(422);
        }

        $this->postJson('/api/checkout', [])
            ->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    public function test_admin_returns_429_on_the_61st_request(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        for ($i = 0; $i < 60; $i++) {
            $this->actingAs($admin)
                ->withHeader('Origin', 'http://localhost:5173')
                ->postJson('/api/admin/products', [])
                ->assertStatus(422);
        }

        $this->actingAs($admin)
            ->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/admin/products', [])
            ->assertStatus(429)
            ->assertHeader('Retry-After');
    }

    private function assertLimit(string $name, int $attempts, Request $request): void
    {
        $limiter = RateLimiter::limiter($name);
        $this->assertNotNull($limiter);

        $limit = $limiter($request);
        $this->assertInstanceOf(Limit::class, $limit);
        $this->assertSame($attempts, $limit->maxAttempts);
        $this->assertSame(60, $limit->decaySeconds);
    }
}
