<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_skips_when_credentials_are_missing(): void
    {
        config([
            'admin.email' => null,
            'admin.password' => null,
        ]);

        $this->seed(AdminUserSeeder::class);

        $this->assertDatabaseMissing('users', ['role' => 'admin']);
    }

    public function test_seeder_creates_admin_from_config_without_a_hardcoded_password(): void
    {
        config([
            'admin.name' => 'Quản trị',
            'admin.email' => 'admin@example.com',
            'admin.password' => 'correct-horse-battery',
            'admin.phone' => null,
        ]);

        $this->seed(AdminUserSeeder::class);

        $admin = User::query()->where('email', 'admin@example.com')->first();
        $this->assertNotNull($admin);
        $this->assertSame('admin', $admin->role);
        $this->assertTrue($admin->is_active);
        $this->assertTrue(Hash::check('correct-horse-battery', $admin->password));
        $this->assertDatabaseMissing('users', ['email' => 'admin@ecom.local']);
    }
}
