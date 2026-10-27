<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Ghi chú nội bộ (chỉ admin thấy). Chuyển orders.admin_note cũ thành ghi chú đầu tiên. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('body');
            $table->timestamps();
            $table->index(['order_id', 'id']);
        });

        DB::table('orders')->whereNotNull('admin_note')->where('admin_note', '!=', '')->orderBy('id')
            ->chunkById(500, function ($orders) {
                DB::table('order_notes')->insert($orders->map(fn ($o) => [
                    'order_id' => $o->id, 'user_id' => null, 'body' => $o->admin_note, 'created_at' => $o->updated_at, 'updated_at' => $o->updated_at,
                ])->all());
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_notes');
    }
};
