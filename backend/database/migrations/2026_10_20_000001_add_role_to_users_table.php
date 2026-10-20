<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The users table created in 2026_01_01_000001 already includes role.
     * This migration adds the column only for databases created before that.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'role')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['customer', 'staff', 'admin'])
                ->default('customer')
                ->after('password');
            $table->index(['role', 'is_active'], 'idx_users_role_active');
        });
    }

    public function down(): void
    {
        // role is created by 2026_01_01_000001_create_users_table on current installs.
        // Rolling this migration back must not drop that column.
    }
};
