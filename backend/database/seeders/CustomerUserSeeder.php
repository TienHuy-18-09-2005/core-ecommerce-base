<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class CustomerUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = $this->configured('customer.email');
        $password = $this->configured('customer.password');

        if ($email === null || $password === null) {
            $this->command?->warn('Bỏ qua tạo khách mẫu: đặt CUSTOMER_EMAIL và CUSTOMER_PASSWORD trong môi trường trước khi seed.');

            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $this->configured('customer.name') ?? 'Khách hàng',
                'phone' => $this->configured('customer.phone'),
                'password' => $password,
                'role' => 'customer',
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
