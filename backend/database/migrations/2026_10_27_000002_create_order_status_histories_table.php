<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Lịch sử trạng thái đơn (timeline): ai/lúc nào/từ→đến/ghi chú.
 * Backfill đơn cũ: dòng "Đặt hàng" tại created_at; các lần đổi từ admin_audit_logs (order.status_changed);
 * đơn không có log thì suy ra từ confirmed_at/delivered_at/cancelled_at (đánh dấu backfilled=true).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->boolean('backfilled')->default(false);
            $table->timestamp('created_at')->nullable();
            $table->index(['order_id', 'id']);
        });

        DB::table('orders')->orderBy('id')->chunkById(500, function ($orders) {
            $ids = $orders->pluck('id');
            $logs = DB::table('admin_audit_logs')->where('subject_type', 'Order')->where('action', 'order.status_changed')
                ->whereIn('subject_id', $ids)->orderBy('id')->get()->groupBy('subject_id');
            $rows = [];
            foreach ($orders as $o) {
                $rows[] = ['order_id' => $o->id, 'from_status' => null, 'to_status' => 'pending', 'user_id' => null,
                    'note' => null, 'backfilled' => true, 'created_at' => $o->created_at];
                $orderLogs = $logs->get($o->id);
                if ($orderLogs && $orderLogs->isNotEmpty()) {
                    foreach ($orderLogs as $l) {
                        $c = json_decode($l->changes ?? '[]', true) ?: [];
                        if (empty($c['to'])) {
                            continue;
                        }
                        $rows[] = ['order_id' => $o->id, 'from_status' => $c['from'] ?? null, 'to_status' => $c['to'], 'user_id' => $l->user_id,
                            'note' => $c['cancel_reason'] ?? $c['note'] ?? null, 'backfilled' => true, 'created_at' => $l->created_at];
                    }
                } elseif ($o->status !== 'pending') {
                    // Không có log: suy ra mốc đã biết, rồi trạng thái hiện tại
                    $prev = 'pending';
                    foreach ([['confirmed', $o->confirmed_at], ['delivered', $o->delivered_at], ['cancelled', $o->cancelled_at]] as [$s, $at]) {
                        if ($at && $s !== $o->status) {
                            $rows[] = ['order_id' => $o->id, 'from_status' => $prev, 'to_status' => $s, 'user_id' => null, 'note' => null, 'backfilled' => true, 'created_at' => $at];
                            $prev = $s;
                        }
                    }
                    $at = match ($o->status) { 'confirmed' => $o->confirmed_at, 'delivered' => $o->delivered_at, 'cancelled' => $o->cancelled_at, default => null } ?? $o->updated_at;
                    $rows[] = ['order_id' => $o->id, 'from_status' => $prev, 'to_status' => $o->status, 'user_id' => null,
                        'note' => $o->status === 'cancelled' ? $o->cancel_reason : null, 'backfilled' => true, 'created_at' => $at];
                }
            }
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('order_status_histories')->insert($chunk);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');
    }
};
