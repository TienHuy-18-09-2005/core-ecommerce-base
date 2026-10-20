<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class AdminGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_gate_allows_active_admin_and_denies_customer(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $customer = User::factory()->create(['role' => 'customer', 'is_active' => true]);
        $inactiveAdmin = User::factory()->create(['role' => 'admin', 'is_active' => false]);
        $staff = User::factory()->create(['role' => 'staff', 'is_active' => true]);

        $this->assertTrue(Gate::forUser($admin)->allows('admin'));
        $this->assertFalse(Gate::forUser($customer)->allows('admin'));
        $this->assertFalse(Gate::forUser($inactiveAdmin)->allows('admin'));
        $this->assertFalse(Gate::forUser($staff)->allows('admin'));
    }

    public function test_new_user_defaults_to_customer(): void
    {
        $user = User::factory()->create();
        $user->refresh();

        $this->assertSame('customer', $user->role);
        $this->assertTrue($user->is_active);
    }
}
