<?php

namespace Tests\Feature;

use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Notifications\ResetPasswordVi;
use App\Notifications\VerifyEmailVi;
use App\Http\Controllers\Auth\PasswordResetController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Tests\TestCase;

class PasswordResetVerificationTest extends TestCase
{
    use RefreshDatabase;

    // ---------- quên / đặt lại mật khẩu ----------

    public function test_forgot_password_gives_the_same_response_for_known_and_unknown_emails(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'co@example.com']);

        $known = $this->postJson('/api/auth/forgot-password', ['email' => 'co@example.com'])->assertOk();
        $unknown = $this->postJson('/api/auth/forgot-password', ['email' => 'khong@example.com'])->assertOk();

        $this->assertSame($known->json(), $unknown->json());
        $known->assertJsonPath('message', PasswordResetController::SENT_MESSAGE);
        Notification::assertSentTo($user, ResetPasswordVi::class);
        Notification::assertCount(1);
    }

    public function test_reset_link_points_to_the_frontend_and_mail_is_vietnamese(): void
    {
        config(['app.frontend_url' => 'https://shop.example']);
        Notification::fake();
        $user = User::factory()->create(['email' => 'co@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'co@example.com']);

        Notification::assertSentTo($user, ResetPasswordVi::class, function (ResetPasswordVi $n) use ($user) {
            $mail = $n->toMail($user);
            $this->assertSame('Đặt lại mật khẩu', $mail->subject);
            $this->assertStringStartsWith('https://shop.example/dat-lai-mat-khau?token=', $mail->actionUrl);
            $this->assertStringContainsString('email=co%40example.com', $mail->actionUrl);

            return true;
        });
    }

    public function test_forgot_password_is_rate_limited_per_email_and_ip(): void
    {
        Notification::fake();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/forgot-password', ['email' => 'x@example.com'])->assertOk();
        }
        $this->postJson('/api/auth/forgot-password', ['email' => 'x@example.com'])->assertStatus(429);
        // Email khác vẫn được
        $this->postJson('/api/auth/forgot-password', ['email' => 'y@example.com'])->assertOk();
    }

    public function test_reset_with_valid_token_changes_password_rotates_remember_token_and_revokes_tokens(): void
    {
        $user = User::factory()->create(['email' => 'co@example.com', 'password' => Hash::make('Cu123456')]);
        $user->createToken('cu');
        $oldRemember = $user->remember_token;
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => 'co@example.com', 'password' => 'Moi123456', 'password_confirmation' => 'Moi123456',
        ])->assertOk();

        $user->refresh();
        $this->assertTrue(Hash::check('Moi123456', $user->password));
        $this->assertNotSame($oldRemember, $user->remember_token);
        $this->assertSame(0, $user->tokens()->count());

        // Token chỉ dùng 1 lần
        $this->postJson('/api/auth/reset-password', [
            'token' => $token, 'email' => 'co@example.com', 'password' => 'Khac123456', 'password_confirmation' => 'Khac123456',
        ])->assertStatus(422)->assertJsonPath('code', DomainException::RESET_TOKEN_INVALID);
    }

    public function test_reset_rejects_bad_token_and_weak_password(): void
    {
        User::factory()->create(['email' => 'co@example.com']);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'sai', 'email' => 'co@example.com', 'password' => 'Moi123456', 'password_confirmation' => 'Moi123456',
        ])->assertStatus(422)->assertJsonPath('code', DomainException::RESET_TOKEN_INVALID);

        $this->postJson('/api/auth/reset-password', [
            'token' => 'x', 'email' => 'co@example.com', 'password' => 'ngan', 'password_confirmation' => 'khac',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    // ---------- xác thực email ----------

    public function test_register_sends_a_vietnamese_verification_mail_with_a_frontend_link(): void
    {
        config(['app.frontend_url' => 'https://shop.example']);
        Notification::fake();

        $this->withHeader('Origin', 'http://localhost:5173')->postJson('/api/auth/register', [
            'name' => 'Mới', 'email' => 'moi@example.com', 'password' => 'Matkhau123', 'password_confirmation' => 'Matkhau123',
        ])->assertCreated()->assertJsonPath('data.user.email_verified', false);

        $user = User::where('email', 'moi@example.com')->first();
        Notification::assertSentTo($user, VerifyEmailVi::class, function (VerifyEmailVi $n) use ($user) {
            $mail = $n->toMail($user);
            $this->assertSame('Xác thực địa chỉ email', $mail->subject);
            $this->assertStringStartsWith('https://shop.example/xac-thuc-email?id='.$user->id, $mail->actionUrl);

            return true;
        });
    }

    public function test_signed_link_verifies_email_and_tampering_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        parse_str(parse_url(VerifyEmailVi::url($user), PHP_URL_QUERY), $q);
        $path = "/api/email/verify/{$q['id']}/{$q['hash']}?expires={$q['expires']}";

        $this->getJson($path.'&signature=sai')->assertForbidden();
        $this->getJson("/api/email/verify/{$q['id']}/".sha1('khac@example.com')."?expires={$q['expires']}&signature={$q['signature']}")->assertForbidden();
        $this->assertFalse($user->fresh()->hasVerifiedEmail());

        $this->getJson($path.'&signature='.$q['signature'])->assertOk();
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_expired_link_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        parse_str(parse_url(VerifyEmailVi::url($user), PHP_URL_QUERY), $q);
        $this->travel(VerifyEmailVi::EXPIRE_MINUTES + 1)->minutes();

        $this->getJson("/api/email/verify/{$q['id']}/{$q['hash']}?expires={$q['expires']}&signature={$q['signature']}")->assertForbidden();
    }

    public function test_resend_requires_auth_and_is_rate_limited(): void
    {
        Notification::fake();
        $this->postJson('/api/email/verification-notification')->assertUnauthorized();

        $user = User::factory()->unverified()->create();
        for ($i = 0; $i < 3; $i++) {
            $this->actingAs($user)->postJson('/api/email/verification-notification')->assertOk();
        }
        $this->actingAs($user)->postJson('/api/email/verification-notification')->assertStatus(429);
        Notification::assertSentToTimes($user, VerifyEmailVi::class, 3);
    }

    public function test_unverified_logged_in_user_cannot_checkout_but_guests_can(): void
    {
        $variant = $this->makeVariant();
        $user = User::factory()->unverified()->create();
        $cart = Cart::create(['user_id' => $user->id]);
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => $variant->id, 'quantity' => 1]);

        $this->actingAs($user)->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/checkout', $this->payload())
            ->assertForbidden()->assertJsonPath('code', DomainException::EMAIL_NOT_VERIFIED);

        // Vẫn duyệt / thêm giỏ được
        $this->actingAs($user)->postJson('/api/cart', ['product_variant_id' => $variant->id, 'quantity' => 1])->assertOk();

        $user->markEmailAsVerified();
        $this->actingAs($user)->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/checkout', $this->payload())->assertCreated();
    }

    private function makeVariant(): ProductVariant
    {
        $product = Product::create(['name' => 'Đèn', 'slug' => 'den-'.Str::random(8), 'status' => 'published']);

        return ProductVariant::create([
            'product_id' => $product->id, 'sku' => 'S-'.Str::random(6), 'name' => 'Mặc định',
            'price' => 100000, 'stock_quantity' => 10, 'is_default' => true, 'is_active' => true,
        ]);
    }

    private function payload(): array
    {
        return [
            'customer_name' => 'A', 'customer_phone' => '0900000000', 'shipping_province' => 'HN',
            'shipping_district' => 'BĐ', 'shipping_ward' => 'ĐB', 'shipping_address' => '1', 'payment_method' => 'cod',
        ];
    }
}
