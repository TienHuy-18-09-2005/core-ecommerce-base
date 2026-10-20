<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = $this->configured('admin.email');
        $password = $this->configured('admin.password');

        if ($email === null || $password === null) {
            $this->command?->warn('Bỏ qua tạo admin: đặt ADMIN_EMAIL và ADMIN_PASSWORD trong môi trường trước khi seed.');

            return;
        }

        $phone = $this->configured('admin.phone');

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $this->configured('admin.name') ?? 'Administrator',
                'phone' => $phone,
                'password' => $password,
                'role' => 'admin',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }

    private function configured(string $key): ?string
    {
        $value = config($key);

        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
