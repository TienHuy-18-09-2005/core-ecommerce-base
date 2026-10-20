<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->string('file_url', 500);
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->string('alt_text')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['product_id', 'sort_order'], 'idx_product_media_product_sort');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_media');
    }
};
