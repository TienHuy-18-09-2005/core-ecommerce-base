<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('brand_id')
                ->nullable()
                ->constrained('brands')
                ->nullOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('short_description')->nullable();
            $table->longText('description')->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->string('unit', 50)->default('cái');
            $table->json('specifications')->nullable();
            $table->boolean('has_variants')->default(false);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->unsignedBigInteger('view_count')->default(0);
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Composite Index bắt buộc theo Phần 5
            $table->index(
                ['status', 'is_featured', 'brand_id', 'created_at'],
                'idx_products_catalog_filter'
            );

            // Full-Text Index bắt buộc theo Phần 5. SQLite (phpunit) không hỗ trợ fulltext.
            if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                $table->fullText(['name', 'short_description'], 'ft_products_search');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
