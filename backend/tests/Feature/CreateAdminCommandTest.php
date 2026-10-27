<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_tao_moi_admin_bang_option(): void
    {
        $this->artisan('admin:create', ['--email' => 'Boss@Shop.VN', '--name' => 'Sếp', '--password' => 'MatKhau123', '--phone' => '0912345678', '--no-interaction' => true])
            ->expectsOutputToContain('Đã tạo tài khoản quản trị boss@shop.vn')
            ->assertSuccessful();

        $u = User::where('email', 'boss@shop.vn')->firstOrFail();
        $this->assertSame('admin', $u->role);
        $this->assertTrue($u->is_active);
        $this->assertNotNull($u->email_verified_at);
        $this->assertTrue(Hash::check('MatKhau123', $u->password));
    }

    public function test_hoi_tuong_tac_va_mat_khau_an(): void
    {
        $this->artisan('admin:create')
            ->expectsQuestion('Email', 'moi@shop.vn')
            ->expectsQuestion('Họ tên', 'Admin Mới')
            ->expectsQuestion('Mật khẩu (ẩn khi gõ)', 'BiMat12345')
            ->expectsQuestion('Nhập lại mật khẩu', 'BiMat12345')
            ->assertSuccessful();

        $this->assertTrue(Hash::check('BiMat12345', User::where('email', 'moi@shop.vn')->value('password')));
    }

    public function test_mat_khau_nhap_lai_khong_khop(): void
    {
        $this->artisan('admin:create')
            ->expectsQuestion('Email', 'x@shop.vn')
            ->expectsQuestion('Họ tên', 'X')
            ->expectsQuestion('Mật khẩu (ẩn khi gõ)', 'BiMat12345')
            ->expectsQuestion('Nhập lại mật khẩu', 'Khac12345')
            ->expectsOutputToContain('không khớp')
            ->assertFailed();
        $this->assertDatabaseMissing('users', ['email' => 'x@shop.vn']);
    }

    public function test_nang_quyen_user_co_san_giu_mat_khau(): void
    {
        $u = User::factory()->create(['email' => 'kh@shop.vn', 'role' => 'customer', 'is_active' => false, 'email_verified_at' => null, 'password' => 'CuCu12345']);

        $this->artisan('admin:create', ['--email' => 'kh@shop.vn', '--no-interaction' => true])
            ->expectsOutputToContain('Đã nâng quyền')
            ->assertSuccessful();

        $u->refresh();
        $this->assertSame('admin', $u->role);
        $this->assertTrue($u->is_active);
        $this->assertNotNull($u->email_verified_at);
        $this->assertTrue(Hash::check('CuCu12345', $u->password));
    }

    public function test_validate_email_mat_khau_sdt(): void
    {
        $this->artisan('admin:create', ['--email' => 'sai-email', '--password' => 'MatKhau123', '--no-interaction' => true])
            ->expectsOutputToContain('Email không hợp lệ.')->assertFailed();
        $this->artisan('admin:create', ['--email' => 'a@shop.vn', '--password' => 'ngan', '--no-interaction' => true])
            ->expectsOutputToContain('Mật khẩu tối thiểu 8 ký tự.')->assertFailed();
        $this->artisan('admin:create', ['--email' => 'a@shop.vn', '--password' => 'MatKhau123', '--phone' => '123', '--no-interaction' => true])
            ->expectsOutputToContain('Số điện thoại không hợp lệ.')->assertFailed();
        $this->artisan('admin:create', ['--email' => 'a@shop.vn', '--no-interaction' => true])
            ->expectsOutputToContain('Thiếu mật khẩu')->assertFailed();
        $this->assertDatabaseMissing('users', ['email' => 'a@shop.vn']);
    }
}
