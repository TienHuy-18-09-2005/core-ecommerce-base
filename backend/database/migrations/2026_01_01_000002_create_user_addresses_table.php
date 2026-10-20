<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('recipient_name');
            $table->string('recipient_phone', 20);
            $table->string('province_code', 20);
            $table->string('district_code', 20);
            $table->string('ward_code', 20);
            $table->string('street_address', 500);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'is_default'], 'idx_user_addresses_user_default');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_addresses');
    }
};
