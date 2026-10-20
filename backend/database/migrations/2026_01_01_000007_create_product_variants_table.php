<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('sku', 100)->unique();
            $table->string('name');
            $table->decimal('price', 15, 2);
            $table->decimal('compare_at_price', 15, 2)->nullable();
            $table->decimal('cost_price', 15, 2)->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->integer('weight_grams')->default(0);
            $table->string('image_url', 500)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Composite Index bắt buộc theo Phần 5
            $table->index(
                ['product_id', 'is_active', 'price', 'stock_quantity'],
                'idx_variants_product_active_price_stock'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};
