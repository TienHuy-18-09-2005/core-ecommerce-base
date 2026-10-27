<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** R4 Đơn hàng: đếm tab, polling đơn mới, bulk đổi trạng thái, ghi chú nội bộ, phiếu in, timeline + backfill. */
class AdminOrdersR4Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    }

    public function test_new_routes_require_admin(): void
    {
        $order = $this->makeOrder();
        $user = User::factory()->create(['role' => 'customer']);
        foreach ([
            ['get', '/api/admin/orders/status-counts'], ['get', '/api/admin/orders/latest-id'],
            ['get', '/api/admin/orders/print?ids[]='.$order->id],
            ['post', '/api/admin/orders/bulk-status'], ['post', "/api/admin/orders/{$order->id}/notes"],
        ] as [$m, $url]) {
            $this->asSpa($user)->json($m, $url)->assertForbidden();
        }
    }

    public function test_status_counts_respect_other_filters_and_payment_method_filter(): void
    {
        $this->makeOrder();
        $this->makeOrder(['status' => 'pending', 'payment_method' => 'vnpay']);
        $this->makeOrder(['status' => 'shipping']);
        $this->makeOrder(['status' => 'cancelled', 'payment_status' => 'paid']);

        $this->asSpa($this->admin)->getJson('/api/admin/orders/status-counts')->assertOk()
            ->assertJsonPath('data.all', 4)->assertJsonPath('data.pending', 2)->assertJsonPath('data.shipping', 1)->assertJsonPath('data.delivered', 0);
        $this->asSpa($this->admin)->getJson('/api/admin/orders/status-counts?payment_status=unpaid&status=shipping')->assertOk()
            ->assertJsonPath('data.all', 3)->assertJsonPath('data.pending', 2);
        $this->asSpa($this->admin)->getJson('/api/admin/orders?payment_method=vnpay')->assertOk()->assertJsonPath('meta.total', 1);
        $this->asSpa($this->admin)->getJson('/api/admin/orders?payment_method=bitcoin')->assertStatus(422);
    }

    public function test_latest_id_counts_only_newer_orders(): void
    {
        $a = $this->makeOrder();
        $this->asSpa($this->admin)->getJson('/api/admin/orders/latest-id')->assertOk()
            ->assertJsonPath('data.latest_id', $a->id)->assertJsonPath('data.new_count', 0)->assertJsonPath('data.pending_count', 1);
        $this->makeOrder();
        $this->makeOrder(['status' => 'confirmed']);
        $this->asSpa($this->admin)->getJson("/api/admin/orders/latest-id?since={$a->id}")->assertOk()
            ->assertJsonPath('data.new_count', 2)->assertJsonPath('data.pending_count', 2);
    }

    public function test_bulk_status_reports_partial_success_per_order(): void
    {
        $p1 = $this->makeOrder();
        $p2 = $this->makeOrder();
        $shipped = $this->makeOrder(['status' => 'shipping']);

        $res = $this->asSpa($this->admin)->postJson('/api/admin/orders/bulk-status', ['ids' => [$p1->id, $shipped->id, $p2->id, 999999], 'status' => 'confirmed'])
            ->assertOk()->assertJsonPath('data.succeeded', 2)->assertJsonPath('data.failed', 2)->json('data.results');
        $this->assertSame([true, false, true, false], array_column($res, 'ok'));
        $this->assertStringContainsString('Đang giao', $res[1]['message']);
        $this->assertSame('confirmed', $p1->refresh()->status);
        $this->assertSame('shipping', $shipped->refresh()->status);
        $this->assertSame(2, AdminAuditLog::where('action', 'order.status_changed')->count());
    }

    public function test_cancel_requires_reason_single_and_bulk_and_reason_on_timeline(): void
    {
        $o = $this->makeOrder();
        $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$o->id}/status", ['status' => 'cancelled'])
            ->assertStatus(422)->assertJsonPath('errors.cancel_reason.0', 'Vui lòng nhập lý do hủy đơn.');
        $this->asSpa($this->admin)->postJson('/api/admin/orders/bulk-status', ['ids' => [$o->id], 'status' => 'cancelled'])->assertStatus(422);
        $this->asSpa($this->admin)->postJson('/api/admin/orders/bulk-status', ['ids' => [$o->id], 'status' => 'cancelled', 'cancel_reason' => 'Hết hàng'])
            ->assertOk()->assertJsonPath('data.succeeded', 1);
        $t = $this->asSpa($this->admin)->getJson("/api/admin/orders/{$o->id}")->json('data.timeline');
        $this->assertSame(['pending', 'cancelled'], array_column($t, 'status'));
        $this->assertSame(['from' => 'pending', 'note' => 'Hết hàng', 'by' => $this->admin->name],
            ['from' => $t[1]['from'], 'note' => $t[1]['note'], 'by' => $t[1]['by']]);
    }

    public function test_internal_notes_are_audited_and_never_shown_to_customer(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $o = $this->makeOrder(['user_id' => $customer->id]);
        $this->asSpa($this->admin)->postJson("/api/admin/orders/{$o->id}/notes", ['body' => ''])->assertStatus(422);
        $this->asSpa($this->admin)->postJson("/api/admin/orders/{$o->id}/notes", ['body' => '  Gọi khách lúc 9h  '])
            ->assertCreated()->assertJsonPath('data.body', 'Gọi khách lúc 9h')->assertJsonPath('data.by', $this->admin->name);
        $this->asSpa($this->admin)->getJson("/api/admin/orders/{$o->id}")->assertJsonPath('data.notes.0.body', 'Gọi khách lúc 9h');
        $this->assertSame(1, AdminAuditLog::where('action', 'order.note_added')->where('subject_id', $o->id)->count());

        $json = $this->asSpa($customer)->getJson("/api/user/orders/{$o->order_code}")->assertOk()->getContent();
        $this->assertStringNotContainsString('Gọi khách', $json);
    }

    public function test_print_returns_store_info_orders_in_order_and_cod_amount(): void
    {
        config(['store.name' => 'Đồ Điện Test', 'store.phone' => '0281234567']);
        DB::table('settings')->insert(['group_name' => 'general', 'key_name' => 'store_phone', 'value' => '0999888777', 'created_at' => now(), 'updated_at' => now()]);
        $a = $this->makeOrder();
        $b = $this->makeOrder(['payment_method' => 'vnpay', 'payment_status' => 'paid']);
        $d = $this->asSpa($this->admin)->getJson("/api/admin/orders/print?ids[]={$b->id}&ids[]={$a->id}")->assertOk()->json('data');
        $this->assertSame('Đồ Điện Test', $d['store']['name']);
        $this->assertSame('0999888777', $d['store']['phone']);
        $this->assertSame([$b->id, $a->id], array_column($d['orders'], 'id'));
        $this->assertEquals([0, 130000], array_column($d['orders'], 'cod_amount'));
        $this->asSpa($this->admin)->getJson('/api/admin/orders/print')->assertStatus(422);
    }

    public function test_history_backfill_from_audit_logs_and_timestamps(): void
    {
        $withLog = $this->makeOrder(['status' => 'confirmed', 'confirmed_at' => now()->subDay()]);
        $noLog = $this->makeOrder(['status' => 'cancelled', 'confirmed_at' => now()->subDays(2), 'cancelled_at' => now()->subDay(), 'cancel_reason' => 'Khách hủy']);
        $migration = require database_path('migrations/2026_10_27_000002_create_order_status_histories_table.php');
        $migration->down();
        AdminAuditLog::create(['user_id' => $this->admin->id, 'action' => 'order.status_changed', 'subject_type' => 'Order', 'subject_id' => $withLog->id,
            'changes' => ['from' => 'pending', 'to' => 'confirmed', 'note' => 'OK']]);
        $migration->up();

        $h1 = DB::table('order_status_histories')->where('order_id', $withLog->id)->orderBy('id')->get();
        $this->assertSame([null, 'pending'], $h1->pluck('from_status')->all());
        $this->assertSame(['pending', 'confirmed'], $h1->pluck('to_status')->all());
        $this->assertSame($this->admin->id, (int) $h1[1]->user_id);

        $h2 = DB::table('order_status_histories')->where('order_id', $noLog->id)->orderBy('id')->get();
        $this->assertSame(['pending', 'confirmed', 'cancelled'], $h2->pluck('to_status')->all());
        $this->assertSame('Khách hủy', $h2[2]->note);
        $this->assertTrue((bool) $h2[2]->backfilled);
    }

    public function test_notes_migration_moves_legacy_admin_note(): void
    {
        $o = $this->makeOrder(['admin_note' => 'Ghi chú cũ']);
        $m = require database_path('migrations/2026_10_27_000003_create_order_notes_table.php');
        $m->down();
        $m->up();
        $this->assertSame('Ghi chú cũ', DB::table('order_notes')->where('order_id', $o->id)->value('body'));
    }

    private int $seq = 0;

    private function asSpa(User $user): static
    {
        return $this->withHeader('Origin', 'http://localhost:5173')->withCredentials()->actingAs($user);
    }

    private function makeOrder(array $over = []): Order
    {
        $this->seq++;

        return Order::create($over + [
            'order_code' => 'ORD-R4-'.str_pad((string) $this->seq, 4, '0', STR_PAD_LEFT),
            'customer_name' => 'Nguyễn A', 'customer_phone' => '0900000000',
            'shipping_province' => 'Hà Nội', 'shipping_district' => 'Ba Đình', 'shipping_ward' => 'Điện Biên', 'shipping_address' => '1 Test',
            'subtotal' => 100000, 'discount_amount' => 0, 'shipping_fee' => 30000, 'total_amount' => 130000,
            'payment_method' => 'cod', 'payment_status' => 'unpaid', 'status' => 'pending',
        ]);
    }
}
