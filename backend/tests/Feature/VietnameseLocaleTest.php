<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class VietnameseLocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_app_locale_is_vietnamese(): void
    {
        $this->assertSame('vi', app()->getLocale());
        $this->assertSame('vi', config('app.fallback_locale'));
    }

    public function test_vi_validation_file_covers_every_framework_rule(): void
    {
        $en = require base_path('vendor/laravel/framework/src/Illuminate/Translation/lang/en/validation.php');
        $vi = require lang_path('vi/validation.php');

        foreach ($en as $key => $value) {
            $this->assertArrayHasKey($key, $vi, "Thiếu rule {$key}");
            if (is_array($value) && ! in_array($key, ['custom', 'attributes'], true)) {
                $this->assertSame([], array_diff(array_keys($value), array_keys($vi[$key])), "Thiếu biến thể {$key}");
            }
        }
        foreach (['auth', 'passwords', 'pagination'] as $file) {
            $this->assertFileExists(lang_path("vi/{$file}.php"));
        }
    }

    public function test_validation_errors_are_vietnamese_with_field_names(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'A', 'email' => 'not-an-email', 'password' => 'abcdefgh', 'password_confirmation' => 'khac',
        ])
            ->assertStatus(422)
            ->assertJsonPath('code', 'VALIDATION_ERROR')
            ->assertJsonPath('errors.email.0', fn (string $m) => str_contains($m, 'email') && ! str_contains($m, 'must'))
            ->assertJsonPath('errors.password', fn (array $m) => collect($m)->every(fn ($x) => ! preg_match('/^[\x00-\x7F]*$/', $x)));

        // Rule không có messages() riêng → lấy từ lang/vi/validation.php + tên trường tiếng Việt
        $msg = validator(['quantity' => 'x'], ['quantity' => 'integer'])->errors()->first('quantity');
        $this->assertSame('Trường số lượng phải là số nguyên.', $msg);
        $msg = validator(['password' => 'abcdefgh'], ['password' => \Illuminate\Validation\Rules\Password::min(8)->numbers()])->errors()->first('password');
        $this->assertSame('Trường mật khẩu phải chứa ít nhất một chữ số.', $msg);
    }

    public function test_standard_http_errors_are_vietnamese_and_codes_unchanged(): void
    {
        $this->getJson('/api/user')->assertStatus(401)
            ->assertJsonPath('code', 'UNAUTHENTICATED')
            ->assertJsonPath('message', 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.');

        $this->getJson('/api/khong-ton-tai')->assertStatus(404)
            ->assertJsonPath('code', 'NOT_FOUND')
            ->assertJsonPath('message', 'Không tìm thấy dữ liệu.');

        $this->actingAs(\App\Models\User::factory()->create(['role' => 'customer']))
            ->postJson('/api/admin/products', [])->assertStatus(403)
            ->assertJsonPath('code', 'FORBIDDEN')
            ->assertJsonPath('message', 'Bạn không có quyền thực hiện thao tác này.');

        $this->deleteJson('/api/auth/login')->assertStatus(405)
            ->assertJsonPath('code', 'METHOD_NOT_ALLOWED')
            ->assertJsonPath('message', 'Phương thức không được hỗ trợ cho địa chỉ này.');
    }

    public function test_throttle_message_is_vietnamese(): void
    {
        RateLimiter::clear('forgot-password');
        $last = null;
        for ($i = 0; $i < 7; $i++) {
            $last = $this->postJson('/api/auth/forgot-password', ['email' => 'nhieu-lan@example.com']);
        }
        $last->assertStatus(429)
            ->assertJsonPath('code', 'TOO_MANY_REQUESTS')
            ->assertJsonPath('message', 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
    }
}
