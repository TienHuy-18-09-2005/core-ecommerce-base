<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminApiAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_call_admin_endpoints(): void
    {
        $this->postJson('/api/admin/products', ['name' => 'Quạt'])->assertUnauthorized();
        $this->patchJson('/api/admin/orders/1/status', ['status' => 'confirmed'])->assertUnauthorized();
    }

    public function test_customer_and_inactive_admin_are_forbidden(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $inactive = User::factory()->create(['role' => 'admin', 'is_active' => false]);

        $this->asSpa($customer)
            ->postJson('/api/admin/products', ['name' => 'Quạt'])
            ->assertForbidden();

        $this->asSpa($inactive)
            ->postJson('/api/admin/products', ['name' => 'Quạt'])
            ->assertForbidden();
    }

    public function test_admin_can_create_product_and_unknown_fields_are_not_saved(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $response = $this->asSpa($admin)->postJson('/api/admin/products', [
            'name' => 'Quạt trần',
            'id' => 12345,
            'view_count' => 9999,
            'slug' => 'hacked-slug',
        ]);

        $response->assertCreated()->assertJsonPath('success', true);

        $product = Product::query()->where('name', 'Quạt trần')->first();
        $this->assertNotNull($product);
        $product->refresh();

        $this->assertNotSame(12345, $product->id);
        $this->assertSame(0, $product->view_count);
        $this->assertNotSame('hacked-slug', $product->slug);
        $this->assertDatabaseMissing('products', ['view_count' => 9999]);
    }

    public function test_admin_product_requires_name(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $this->asSpa($admin)
            ->postJson('/api/admin/products', ['view_count' => 5])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors' => ['name']]);
    }

    public function test_admin_can_update_order_status_without_saving_unknown_fields(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $order = $this->makeOrder();

        $this->asSpa($admin)->patchJson('/api/admin/orders/'.$order->id.'/status', [
            'status' => 'confirmed',
            'admin_note' => 'Đã gọi khách',
            'payment_status' => 'paid',
            'total_amount' => 1,
            'user_id' => 999,
        ])->assertOk()->assertJsonPath('success', true);

        $order->refresh();
        $this->assertSame('confirmed', $order->status);
        $this->assertSame('Đã gọi khách', $order->admin_note);
        $this->assertSame('unpaid', $order->payment_status);
        $this->assertNull($order->user_id);
        $this->assertEquals(130000, (float) $order->total_amount);
    }

    public function test_order_status_requires_a_known_status(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $order = $this->makeOrder();

        $this->asSpa($admin)
            ->patchJson('/api/admin/orders/'.$order->id.'/status', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);

        $this->asSpa($admin)
            ->patchJson('/api/admin/orders/'.$order->id.'/status', ['status' => 'hacked'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['status']);
    }

    public function test_legacy_admin_routes_are_gone(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);

        $this->postJson('/api/products', ['name' => 'Không được tạo'])->assertStatus(405);
        $this->asSpa($admin)->postJson('/api/products', ['name' => 'Không được tạo'])->assertStatus(405);
        $this->assertDatabaseMissing('products', ['name' => 'Không được tạo']);

        $this->patchJson('/api/orders/1/status', ['status' => 'confirmed'])->assertNotFound();
        $this->asSpa($admin)->patchJson('/api/orders/1/status', ['status' => 'confirmed'])->assertNotFound();
    }

    private function asSpa(User $user): static
    {
        return $this->withHeader('Origin', 'http://localhost:5173')
            ->withCredentials()
            ->actingAs($user);
    }

    private function makeOrder(): Order
    {
        return Order::create([
            'order_code' => 'ORD-TEST0001',
            'customer_name' => 'Nguyễn A',
            'customer_phone' => '0900000000',
            'shipping_province' => 'Hà Nội',
            'shipping_district' => 'Ba Đình',
            'shipping_ward' => 'Điện Biên',
            'shipping_address' => '1 Test',
            'subtotal' => 100000,
            'discount_amount' => 0,
            'shipping_fee' => 30000,
            'total_amount' => 130000,
            'payment_method' => 'cod',
            'payment_status' => 'unpaid',
            'status' => 'pending',
        ]);
    }
}
