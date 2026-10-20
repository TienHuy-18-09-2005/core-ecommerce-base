<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * session_id stores the SHA-256 hash of the server-issued cart token.
     * Logged-in carts keep this column null and are identified by user_id.
     */
    public function up(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->unique('session_id', 'carts_session_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('carts', function (Blueprint $table) {
            $table->dropUnique('carts_session_id_unique');
        });
    }
};
