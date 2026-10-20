<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('variant_attribute_values', function (Blueprint $table) {
            $table->foreignId('variant_id')
                ->constrained('product_variants')
                ->cascadeOnDelete();
            $table->foreignId('attribute_value_id')
                ->constrained('attribute_values')
                ->cascadeOnDelete();

            // Primary Key kép (variant_id, attribute_value_id)
            $table->primary(['variant_id', 'attribute_value_id']);

            // Covering Index bắt buộc theo Phần 5
            $table->index(
                ['attribute_value_id', 'variant_id'],
                'idx_vav_covering_attr_variant'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_attribute_values');
    }
};
