<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminSortTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    }

    public function test_products_sort_by_name_both_directions(): void
    {
        foreach (['Bóng B', 'An A', 'Cột C'] as $i => $n) {
            Product::create(['name' => $n, 'slug' => 's'.$i, 'status' => 'published']);
        }
        $asc = $this->actingAs($this->admin)->getJson('/api/admin/products?sort=name&direction=asc')->assertOk()->json('data.*.name');
        $this->assertSame(['An A', 'Bóng B', 'Cột C'], $asc);
        $desc = $this->actingAs($this->admin)->getJson('/api/admin/products?sort=name&direction=desc')->json('data.*.name');
        $this->assertSame(['Cột C', 'Bóng B', 'An A'], $desc);
        // giá trị cũ vẫn chạy
        $this->actingAs($this->admin)->getJson('/api/admin/products?sort=oldest')->assertOk();
    }

    public function test_coupons_sort_by_code(): void
    {
        foreach (['ZZZ', 'AAA', 'MMM'] as $c) {
            Coupon::create(['code' => $c, 'type' => 'fixed', 'value' => 1000, 'is_active' => true]);
        }
        $codes = $this->actingAs($this->admin)->getJson('/api/admin/coupons?sort=code&direction=asc')->assertOk()->json('data.*.code');
        $this->assertSame(['AAA', 'MMM', 'ZZZ'], $codes);
    }

    public static function badSorts(): array
    {
        return [
            ['/api/admin/products?sort=cost_price'],
            ['/api/admin/products?sort=name&direction=sideways'],
            ['/api/admin/orders?sort=customer_email'],
            ['/api/admin/orders?sort=id;drop table orders'],
            ['/api/admin/coupons?sort=per_customer_limit'],
            ['/api/admin/reviews?sort=comment'],
        ];
    }

    #[DataProvider('badSorts')]
    public function test_unknown_sort_fields_are_rejected(string $uri): void
    {
        $this->actingAs($this->admin)->getJson($uri)->assertStatus(422)->assertJsonPath('success', false);
    }

    public function test_allowed_sorts_return_ok(): void
    {
        foreach (['/api/admin/orders?sort=total_amount&direction=desc', '/api/admin/reviews?sort=rating&direction=asc', '/api/admin/products?sort=stock_total', '/api/admin/products?sort=price_min&direction=desc'] as $uri) {
            $this->actingAs($this->admin)->getJson($uri)->assertOk();
        }
    }
}
