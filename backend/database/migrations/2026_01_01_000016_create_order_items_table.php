<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')
                ->nullable()
                ->constrained('products')
                ->nullOnDelete();
            $table->foreignId('product_variant_id')
                ->nullable()
                ->constrained('product_variants')
                ->nullOnDelete();
            $table->string('product_name');
            $table->string('variant_name');
            $table->string('sku', 100);
            $table->string('thumbnail_url', 500)->nullable();
            $table->decimal('unit_price', 15, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('line_total', 15, 2);

            $table->index('order_id', 'idx_order_items_order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
