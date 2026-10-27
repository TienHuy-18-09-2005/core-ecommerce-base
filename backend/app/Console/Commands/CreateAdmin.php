<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use App\Services\Admin\PermissionService;
use App\Support\VietnamesePhone;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

/**
 * Tạo mới hoặc nâng quyền một tài khoản thành admin.
 * Dùng: php artisan admin:create  (hỏi lần lượt)
 *   hoặc php artisan admin:create --email=a@b.vn --name="Admin" --password=... --phone=09...
 *   nhân viên: php artisan admin:create --email=nv@b.vn --role=staff --staff-role=product_manager,accountant
 */
class CreateAdmin extends Command
{
    protected $signature = 'admin:create
        {--name= : Họ tên}
        {--email= : Email đăng nhập}
        {--password= : Mật khẩu (tối thiểu 8 ký tự). Bỏ trống để nhập ẩn}
        {--phone= : Số điện thoại (tùy chọn)}
        {--role=admin : admin hoặc staff (nhân viên)}
        {--staff-role= : Slug vai trò cho nhân viên, cách nhau bằng dấu phẩy (vd. product_manager,accountant)}';

    protected $description = 'Tạo tài khoản quản trị hoặc nâng quyền tài khoản có sẵn thành admin';

    public function handle(): int
    {
        $email = $this->option('email') ?? ($this->input->isInteractive() ? $this->ask('Email') : null);
        $email = strtolower(trim((string) $email));

        $emailCheck = Validator::make(['email' => $email], ['email' => ['required', 'email', 'max:255']],
            ['email.required' => 'Email là bắt buộc.', 'email.email' => 'Email không hợp lệ.', 'email.max' => 'Email tối đa 255 ký tự.']);
        if ($emailCheck->fails()) {
            return $this->failWith($emailCheck->errors()->all());
        }

        $role = (string) $this->option('role');
        if (! in_array($role, ['admin', 'staff'], true)) {
            return $this->failWith(['--role chỉ nhận admin hoặc staff.']);
        }
        $roleIds = [];
        if ($role === 'staff') {
            $slugs = array_values(array_filter(array_map('trim', explode(',', (string) $this->option('staff-role')))));
            $found = Role::whereIn('slug', $slugs)->pluck('id', 'slug');
            $missing = array_diff($slugs, $found->keys()->all());
            if ($slugs === [] || $missing) {
                return $this->failWith(['Cần --staff-role hợp lệ. Vai trò có sẵn: '.Role::orderBy('slug')->pluck('slug')->implode(', ').($missing ? '. Không tìm thấy: '.implode(', ', $missing) : '')]);
            }
            $roleIds = $found->values()->all();
        }

        $user = User::where('email', $email)->first();
        $interactive = $this->input->isInteractive();

        $name = $this->option('name') ?? ($user?->name ?? ($interactive ? $this->ask('Họ tên', 'Quản trị viên') : 'Quản trị viên'));

        $password = $this->option('password');
        if ($password === null && ! $user) {
            if (! $interactive) {
                return $this->failWith(['Thiếu mật khẩu: dùng --password khi chạy không tương tác.']);
            }
            $password = $this->secret('Mật khẩu (ẩn khi gõ)');
            $confirm = $this->secret('Nhập lại mật khẩu');
            if ($password !== $confirm) {
                return $this->failWith(['Hai lần nhập mật khẩu không khớp.']);
            }
        }

        $phone = $this->option('phone');

        $v = Validator::make(
            ['name' => $name, 'password' => $password, 'phone' => $phone],
            [
                'name' => ['required', 'string', 'max:255'],
                'password' => ['nullable', 'string', 'min:8', 'max:255'],
                'phone' => ['nullable', 'string', function ($attr, $value, $fail) {
                    if (! VietnamesePhone::isValid($value)) {
                        $fail('Số điện thoại không hợp lệ.');
                    }
                }],
            ],
            ['name.required' => 'Họ tên là bắt buộc.', 'password.min' => 'Mật khẩu tối thiểu 8 ký tự.']
        );
        if ($v->fails()) {
            return $this->failWith($v->errors()->all());
        }

        $isNew = ! $user;
        $user ??= new User(['email' => $email]);
        $attrs = ['name' => $name, 'role' => $role, 'is_active' => true];
        if ($password !== null) {
            $attrs['password'] = $password;
        }
        if ($phone !== null && $phone !== '') {
            $attrs['phone'] = VietnamesePhone::normalize($phone);
        }
        if (! $user->email_verified_at) {
            $attrs['email_verified_at'] = now();
        }
        $user->forceFill($attrs)->save();
        $user->roles()->sync($roleIds);
        app(PermissionService::class)->forget($user->id);
        if ($role === 'staff') {
            $this->info("Đã tạo/cập nhật nhân viên {$email} với vai trò: ".implode(', ', $slugs).'.');

            return self::SUCCESS;
        }

        $this->info($isNew
            ? "Đã tạo tài khoản quản trị {$email}."
            : "Đã nâng quyền {$email} thành quản trị viên (đang hoạt động, đã xác thực email).");

        return self::SUCCESS;
    }

    /** @param list<string> $errors */
    private function failWith(array $errors): int
    {
        foreach ($errors as $e) {
            $this->error($e);
        }

        return self::FAILURE;
    }
}
