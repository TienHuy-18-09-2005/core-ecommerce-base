<?php

namespace Tests\Feature;

use App\Exceptions\DomainException;
use App\Exceptions\RenderApiExceptions;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Shop\GuestCartToken;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use PDOException;
use Tests\TestCase;

class ApiExceptionHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_errors_return_a_safe_code_and_are_logged(): void
    {
        config(['app.debug' => true]);

        $sql = 'select password from users where email = ?';
        $logged = [];
        Event::listen(MessageLogged::class, function (MessageLogged $event) use (&$logged) {
            $logged[] = $event->message;
            $exception = $event->context['exception'] ?? null;
            if ($exception instanceof QueryException) {
                $logged[] = $exception->getMessage();
                $logged[] = $exception->getSql();
            } elseif ($exception instanceof \Throwable) {
                $logged[] = $exception->getMessage();
            }
        });

        Route::get('/api/_test/db-error', function () use ($sql) {
            throw new QueryException(
                'sqlite',
                $sql,
                ['admin@example.com'],
                new PDOException('SQLSTATE[HY000]: General error')
            );
        });

        $response = $this->getJson('/api/_test/db-error');

        $response->assertStatus(500)->assertExactJson([
            'success' => false,
            'code' => RenderApiExceptions::SERVER_ERROR,
            'message' => RenderApiExceptions::SAFE_SERVER_MESSAGE,
        ]);

        $body = $response->getContent();
        $this->assertStringNotContainsString('SQLSTATE', $body);
        $this->assertStringNotContainsString('select password', $body);
        $this->assertStringNotContainsString('trace', $body);
        $this->assertStringContainsString('SQLSTATE', implode("\n", $logged));
        $this->assertStringContainsString($sql, implode("\n", $logged));
    }

    public function test_stock_errors_use_a_domain_code_and_still_set_the_cart_cookie(): void
    {
        $product = Product::create([
            'name' => 'Quạt',
            'slug' => 'quat-'.Str::random(6),
            'status' => 'published',
        ]);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-'.Str::random(6),
            'name' => 'Mặc định',
            'price' => 100000,
            'stock_quantity' => 0,
            'is_default' => true,
            'is_active' => true,
        ]);

        $response = $this->withCredentials()->postJson('/api/cart', [
            'product_variant_id' => $variant->id,
            'quantity' => 1,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', DomainException::STOCK_UNAVAILABLE)
            ->assertJsonPath('message', 'Chỉ còn 0 sản phẩm trong kho.');

        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $response->assertCookie(GuestCartToken::COOKIE_NAME);
    }
}
