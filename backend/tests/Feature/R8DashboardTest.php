<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Order;
use App\Models\User;
use App\Services\Admin\DashboardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\Role;
use Tests\TestCase;

class R8DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['shop.report_timezone' => 'Asia/Ho_Chi_Minh']);
        Carbon::setTestNow(Carbon::parse('2026-10-20 05:00:00', 'UTC')); // 12:00 giờ VN
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function staff(string $role): User
    {
        $u = User::factory()->create(['role' => $role === 'admin' ? 'admin' : 'staff']);
        if ($role !== 'admin') {
            $u->roles()->attach(Role::where('slug', $role)->value('id'));
        }

        return $u;
    }

    private function order(string $at, float $total, string $status = 'delivered'): Order
    {
        $o = $this->mk($total, $status);
        DB::table('orders')->where('id', $o->id)->update(['created_at' => Carbon::parse($at, 'UTC')]);

        return $o;
    }

    private function mk(float $total, string $status = 'pending'): Order
    {
        return Order::create([
            'order_code' => 'ORD-'.strtoupper(uniqid()), 'customer_name' => 'A', 'customer_phone' => '0900000000',
            'shipping_province' => 'HN', 'shipping_district' => 'BD', 'shipping_ward' => 'X', 'shipping_address' => '1',
            'subtotal' => $total, 'discount_amount' => 0, 'shipping_fee' => 0, 'total_amount' => $total,
            'payment_method' => 'cod', 'payment_status' => 'unpaid', 'status' => $status,
        ]);
    }

    public function test_change_pct(): void
    {
        $this->assertSame(50.0, DashboardService::changePct(150, 100));
        $this->assertSame(-25.0, DashboardService::changePct(75, 100));
        $this->assertNull(DashboardService::changePct(10, 0));
    }

    public function test_kpis_compare_with_previous_period(): void
    {
        $this->order('2026-10-19 02:00:00', 300000);           // trong 7 ngày
        $this->order('2026-10-18 02:00:00', 100000);
        $this->order('2026-10-18 03:00:00', 999999, 'cancelled'); // không tính doanh thu
        $this->order('2026-10-10 02:00:00', 200000);           // kỳ trước
        $this->actingAs($this->staff('admin'));

        $d = $this->getJson('/api/admin/dashboard?range=7d')->assertOk()->json('data');
        $this->assertSame(400000, (int) $d['kpis']['revenue']['current']);
        $this->assertSame(200000, (int) $d['kpis']['revenue']['previous']);
        $this->assertEquals(100.0, $d['kpis']['revenue']['change_pct']);
        $this->assertSame(3, $d['kpis']['orders']['current']);
        $this->assertEquals(200000, $d['kpis']['avg_order_value']['current']);
        $this->assertCount(7, $d['revenue_series']);
        $this->assertSame('2026-10-14', $d['range']['from']);
    }

    public function test_timezone_bucketing_and_today_hourly(): void
    {
        $this->order('2026-10-19 18:30:00', 50000); // = 01:30 ngày 20 giờ VN → thuộc hôm nay
        $this->actingAs($this->staff('admin'));
        $d = $this->getJson('/api/admin/dashboard?range=today')->assertOk()->json('data');
        $this->assertSame('hour', $d['granularity']);
        $this->assertCount(13, $d['revenue_series']);
        $this->assertEquals(50000, $d['revenue_series'][1]['revenue']);
        $this->assertEquals(50000, $d['stats']['revenue_today']);
    }

    public function test_invalid_range_rejected(): void
    {
        $this->actingAs($this->staff('admin'));
        $this->getJson('/api/admin/dashboard?range=99d')->assertStatus(422);
    }

    public function test_todo_counts_expiring_coupons(): void
    {
        Coupon::create(['code' => 'S1', 'type' => 'fixed', 'value' => 1, 'is_active' => true, 'expires_at' => now()->addDays(3)]);
        Coupon::create(['code' => 'S2', 'type' => 'fixed', 'value' => 1, 'is_active' => true, 'expires_at' => now()->addDays(30)]);
        $this->order('2026-10-19 02:00:00', 1000, 'pending');
        $this->actingAs($this->staff('admin'));
        $d = $this->getJson('/api/admin/dashboard')->json('data');
        $this->assertSame(1, $d['todo']['expiring_coupons']);
        $this->assertSame(1, $d['todo']['pending_orders']);
    }

    public function test_top_products_hide_revenue_without_permission(): void
    {
        $o = $this->order('2026-10-19 02:00:00', 130000);
        $o->items()->create(['product_name' => 'Áo', 'variant_name' => 'M', 'sku' => 'AO-M', 'quantity' => 2, 'unit_price' => 65000, 'line_total' => 130000]);
        $this->actingAs($this->staff('product_manager'));
        $res = $this->getJson('/api/admin/dashboard')->assertOk();
        $d = $res->json('data');
        $this->assertSame(2, $d['top_products'][0]['quantity']);
        $this->assertArrayNotHasKey('revenue', $d['top_products'][0]);
        $this->assertArrayNotHasKey('revenue', $d['kpis']);
        $this->assertStringNotContainsString('130000', $res->getContent());
    }

    /** Ma trận quyền: khối nào xuất hiện với vai trò nào. */
    public function test_permission_matrix(): void
    {
        $matrix = [
            'admin' => ['revenue' => true, 'pending' => true, 'low' => true, 'reviews' => true, 'coupons' => true],
            'accountant' => ['revenue' => true],
            'product_manager' => ['revenue' => false, 'low' => true],
            'customer_care' => ['revenue' => false, 'pending' => true],
        ];
        foreach ($matrix as $role => $exp) {
            $this->actingAs($this->staff($role));
            $d = $this->getJson('/api/admin/dashboard')->assertOk()->json('data');
            $this->assertSame($exp['revenue'], isset($d['kpis']['revenue']), "$role revenue");
            $this->assertSame($exp['revenue'], isset($d['revenue_series'][0]['revenue']), "$role series");
            foreach (['pending' => 'pending_orders', 'low' => 'low_stock_variants', 'reviews' => 'hidden_reviews', 'coupons' => 'expiring_coupons'] as $k => $todo) {
                if (isset($exp[$k])) {
                    $this->assertSame($exp[$k], array_key_exists($todo, $d['todo']), "$role $todo");
                }
            }
        }
    }

    public function test_cache_refreshes_when_order_changes(): void
    {
        config(['cache.default' => 'array']);
        $this->actingAs($this->staff('admin'));
        $this->assertSame(0, $this->getJson('/api/admin/dashboard')->json('data.kpis.orders.current'));
        $this->mk(1000);
        $this->assertSame(1, $this->getJson('/api/admin/dashboard')->json('data.kpis.orders.current'));
    }
}
