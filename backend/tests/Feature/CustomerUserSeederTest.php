<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\CustomerUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CustomerUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_skips_when_the_password_is_missing(): void
    {
        config([
            'customer.email' => 'customer@ecom.local',
            'customer.password' => null,
        ]);

        $this->seed(CustomerUserSeeder::class);

        $this->assertDatabaseMissing('users', ['email' => 'customer@ecom.local']);
    }

    public function test_seeder_creates_the_customer_from_config(): void
    {
        config([
            'customer.name' => 'Nguyễn Văn Khách',
            'customer.email' => 'customer@ecom.local',
            'customer.password' => 'local-customer-secret',
            'customer.phone' => '0900000002',
        ]);

        $this->seed(CustomerUserSeeder::class);

        $customer = User::query()->where('email', 'customer@ecom.local')->first();
        $this->assertNotNull($customer);
        $this->assertSame('customer', $customer->role);
        $this->assertTrue(Hash::check('local-customer-secret', $customer->password));
    }

    public function test_seeders_do_not_contain_a_hardcoded_password(): void
    {
        $seeders = file_get_contents(database_path('seeders/DatabaseSeeder.php'))
            .file_get_contents(database_path('seeders/CustomerUserSeeder.php'))
            .file_get_contents(database_path('seeders/AdminUserSeeder.php'));

        $this->assertStringNotContainsString('password123', $seeders);
    }

    public function test_session_cookie_domain_is_host_only_when_unset(): void
    {
        $this->assertNull(config('session.domain'));
    }
}
