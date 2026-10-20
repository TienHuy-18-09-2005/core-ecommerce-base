<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->enum('group_name', ['general', 'theme', 'shipping', 'payment', 'seo']);
            $table->string('key_name', 100)->unique();
            $table->longText('value')->nullable();
            $table->timestamps();

            $table->index('group_name', 'idx_settings_group_name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
