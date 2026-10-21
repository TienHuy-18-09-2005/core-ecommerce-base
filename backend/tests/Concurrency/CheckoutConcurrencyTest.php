<?php

namespace Tests\Concurrency;

use App\DTOs\Order\CreateOrderDTO;
use App\Exceptions\DomainException;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Shop\CouponService;
use App\Services\Shop\OrderService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;
use Throwable;

/**
 * Nhiều TIẾN TRÌNH thật (pcntl_fork), mỗi tiến trình 1 kết nối MySQL riêng, cùng đặt hàng
 * tại 1 thời điểm (barrier theo đồng hồ). Kiểm lockForUpdate trên cart/variant/coupon.
 */
class CheckoutConcurrencyTest extends TestCase
{
    public const SAFE_DATABASE = 'ecom_concurrency_test';

    protected function setUp(): void
    {
        parent::setUp();

        $config = config('database.connections.'.config('database.default'));
        if (config('database.default') !== 'mysql'
            || ($config['database'] ?? null) !== self::SAFE_DATABASE
            || in_array($config['host'] ?? '', ['mysql', 'ecom_mysql'], true)) {
            $this->fail('Từ chối chạy: chỉ được chạy trên DB tạm "'.self::SAFE_DATABASE.'" (không phải DB dev). Dùng ./scripts/concurrency-test.sh');
        }

        if (! function_exists('pcntl_fork')) {
            $this->markTestSkipped('Cần extension pcntl.');
        }

        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_two_or_more_buyers_racing_for_the_last_unit_only_one_wins(): void
    {
        $variant = $this->makeVariant(stock: 1);
        $buyers = 10;
        $carts = array_map(fn () => $this->guestCart($variant, 1), range(1, $buyers));

        $results = $this->race(array_map(fn ($hash) => fn () => $this->checkout($hash), $carts));

        $this->assertNoUnexpectedErrors($results);
        $this->assertCount(1, array_filter($results, fn ($r) => $r['ok']));
        $this->assertCount($buyers - 1, array_filter($results, fn ($r) => $r['code'] === DomainException::STOCK_UNAVAILABLE));
        $this->assertSame(0, $variant->fresh()->stock_quantity);
        $this->assertSame(1, Order::count());
        $this->assertSame(1, (int) DB::table('order_items')->sum('quantity'));
    }

    public function test_stock_never_goes_negative_with_multi_unit_orders(): void
    {
        $variant = $this->makeVariant(stock: 5);
        // 8 người mua 2 cái → tối đa 2 đơn thành công (4 cái), còn 1
        $carts = array_map(fn () => $this->guestCart($variant, 2), range(1, 8));

        $results = $this->race(array_map(fn ($hash) => fn () => $this->checkout($hash), $carts));

        $this->assertNoUnexpectedErrors($results);
        $this->assertCount(2, array_filter($results, fn ($r) => $r['ok']));
        $this->assertSame(1, $variant->fresh()->stock_quantity);
        $this->assertSame(4, (int) DB::table('order_items')->sum('quantity'));
    }

    public function test_coupon_used_count_never_exceeds_usage_limit(): void
    {
        $variant = $this->makeVariant(stock: 100);
        Coupon::create(['code' => 'RACE3', 'type' => 'fixed', 'value' => 10000, 'usage_limit' => 3]);
        $buyers = 12;
        $carts = array_map(fn () => $this->guestCart($variant, 1), range(1, $buyers));

        $results = $this->race(array_map(
            fn ($hash, $i) => fn () => $this->checkout($hash, coupon: 'RACE3', phone: sprintf('09%08d', $i)),
            $carts,
            array_keys($carts),
        ));

        $this->assertNoUnexpectedErrors($results);
        $this->assertCount(3, array_filter($results, fn ($r) => $r['ok']));
        $this->assertCount($buyers - 3, array_filter($results, fn ($r) => $r['code'] === CouponService::USAGE_LIMIT_REACHED));
        $this->assertSame(3, Coupon::where('code', 'RACE3')->value('used_count'));
        $this->assertSame(3, Order::whereNotNull('coupon_id')->count());
        // Đơn bị từ chối vì coupon không được trừ kho
        $this->assertSame(97, $variant->fresh()->stock_quantity);
    }

    public function test_parallel_retries_with_the_same_idempotency_key_create_one_order(): void
    {
        $variant = $this->makeVariant(stock: 10);
        $hash = $this->guestCart($variant, 1);
        $key = (string) Str::uuid();

        $results = $this->race(array_fill(0, 6, fn () => $this->checkout($hash, key: $key)));

        $this->assertNoUnexpectedErrors($results);
        $codes = array_unique(array_column(array_filter($results, fn ($r) => $r['ok']), 'order_code'));
        $this->assertCount(6, array_filter($results, fn ($r) => $r['ok']), json_encode($results));
        $this->assertCount(1, $codes);
        $this->assertSame(1, Order::count());
        $this->assertSame(9, $variant->fresh()->stock_quantity);
    }

    // ---------- harness ----------

    /**
     * Fork 1 tiến trình cho mỗi job; tất cả chờ tới cùng 1 mốc thời gian rồi chạy.
     *
     * @param  list<callable(): array>  $jobs
     * @return list<array{ok: bool, code: ?string, order_code: ?string, error: ?string}>
     */
    private function race(array $jobs): array
    {
        DB::disconnect();
        $startAt = microtime(true) + 0.5;
        $dir = sys_get_temp_dir().'/race-'.Str::random(8);
        mkdir($dir);
        $pids = [];

        foreach ($jobs as $i => $job) {
            $pid = pcntl_fork();
            if ($pid === -1) {
                $this->fail('pcntl_fork thất bại');
            }
            if ($pid === 0) {
                $result = ['ok' => false, 'code' => null, 'order_code' => null, 'error' => null];
                try {
                    DB::purge();
                    DB::reconnect();
                    while (microtime(true) < $startAt) {
                        usleep(200);
                    }
                    $result = array_merge($result, $job());
                } catch (DomainException $e) {
                    $result['code'] = $e->errorCode;
                } catch (Throwable $e) {
                    $result['error'] = get_class($e).': '.$e->getMessage();
                }
                file_put_contents("{$dir}/{$i}.json", json_encode($result));
                // Thoát ngay, không chạy shutdown handler của PHPUnit trong tiến trình con
                posix_kill(getmypid(), SIGKILL);
            }
            $pids[] = $pid;
        }

        foreach ($pids as $pid) {
            pcntl_waitpid($pid, $status);
        }

        DB::reconnect();
        $results = [];
        foreach (array_keys($jobs) as $i) {
            $file = "{$dir}/{$i}.json";
            $results[] = is_file($file)
                ? json_decode(file_get_contents($file), true)
                : ['ok' => false, 'code' => null, 'order_code' => null, 'error' => 'tiến trình con không trả kết quả'];
            @unlink($file);
        }
        @rmdir($dir);

        fwrite(STDERR, sprintf("\n  [%s] %s\n", $this->name(), json_encode(array_count_values(array_map(
            fn ($r) => $r['ok'] ? 'OK' : ($r['code'] ?? 'ERROR'),
            $results,
        )))));

        return $results;
    }

    private function checkout(string $sessionHash, ?string $coupon = null, string $phone = '0900000000', ?string $key = null): array
    {
        $dto = new CreateOrderDTO(
            userId: null,
            idempotencyKey: $key ?? (string) Str::uuid(),
            customerName: 'Khách Race',
            customerPhone: $phone,
            customerEmail: null,
            shippingProvince: 'Hà Nội',
            shippingDistrict: 'Ba Đình',
            shippingWard: 'Điện Biên',
            shippingAddress: '1 Test',
            paymentMethod: 'cod',
            customerNote: null,
            couponCode: $coupon,
        );
        $result = app(OrderService::class)->createOrder($dto, $sessionHash);

        return ['ok' => true, 'order_code' => $result['order']->order_code];
    }

    private function assertNoUnexpectedErrors(array $results): void
    {
        $errors = array_filter(array_column($results, 'error'));
        $this->assertSame([], array_values($errors), 'Lỗi ngoài dự kiến (deadlock/SQL...): '.implode(' | ', $errors));
    }

    private function guestCart(ProductVariant $variant, int $qty): string
    {
        $hash = hash('sha256', Str::random(40));
        $cart = Cart::create(['session_id' => $hash]);
        CartItem::create(['cart_id' => $cart->id, 'product_variant_id' => $variant->id, 'quantity' => $qty]);

        return $hash;
    }

    private function makeVariant(int $stock): ProductVariant
    {
        $product = Product::create(['name' => 'Đèn race', 'slug' => 'den-race-'.Str::random(6), 'status' => 'published']);

        return ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'RACE-'.Str::random(6),
            'name' => 'Mặc định',
            'price' => 100000,
            'stock_quantity' => $stock,
            'is_default' => true,
            'is_active' => true,
        ]);
    }
}
