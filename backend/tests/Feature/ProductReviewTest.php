<?php

namespace Tests\Feature;

use App\Exceptions\DomainException;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use RefreshDatabase;

    private const SPA = 'http://localhost:5173';

    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->product = Product::create(['name' => 'Đèn LED', 'slug' => 'den-led', 'status' => 'published']);
    }

    public function test_public_list_returns_only_approved_reviews_with_distribution_and_masked_names(): void
    {
        $a = User::factory()->create(['name' => 'Nguyễn Văn An']);
        $b = User::factory()->create();
        $c = User::factory()->create();
        ProductReview::create(['product_id' => $this->product->id, 'user_id' => $a->id, 'rating' => 5, 'comment' => '<b>Tốt</b>', 'is_approved' => true]);
        ProductReview::create(['product_id' => $this->product->id, 'user_id' => $b->id, 'rating' => 4, 'is_approved' => true]);
        ProductReview::create(['product_id' => $this->product->id, 'user_id' => $c->id, 'rating' => 1, 'is_approved' => false]);

        $res = $this->getJson('/api/products/den-led/reviews')->assertOk();

        $res->assertJsonPath('data.summary.count', 2)
            ->assertJsonPath('data.summary.average', 4.5)
            ->assertJsonPath('data.summary.distribution', ['5' => 1, '4' => 1, '3' => 0, '2' => 0, '1' => 0])
            ->assertJsonCount(2, 'data.reviews.data');
        $first = collect($res->json('data.reviews.data'))->firstWhere('rating', 5);
        $this->assertSame('N. V. An', $first['author_name']);
        $this->assertSame('<b>Tốt</b>', $first['comment'], 'Lưu nguyên văn bản; FE render text thuần');
        $this->assertStringNotContainsString($a->email, $res->getContent());

        $this->getJson('/api/products/den-led/reviews?rating=4')->assertJsonCount(1, 'data.reviews.data');
        $this->getJson('/api/products/den-led/reviews?rating=9')->assertStatus(422);
        $this->getJson('/api/products/khong-co/reviews')->assertStatus(404)->assertJsonPath('success', false);
    }

    public function test_guest_cannot_post(): void
    {
        $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])->assertStatus(401);
    }

    public function test_only_verified_buyers_with_a_delivered_order_can_review(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->spa()->getJson('/api/products/den-led/reviews/eligibility')
            ->assertOk()->assertJsonPath('data.can_review', false)->assertJsonPath('data.reason', DomainException::REVIEW_NOT_PURCHASED);
        $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])
            ->assertStatus(403)->assertJsonPath('code', DomainException::REVIEW_NOT_PURCHASED);

        // Đơn chưa giao không đủ điều kiện
        $this->orderWithProduct($user, 'shipping');
        $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])->assertStatus(403);

        // Đơn đã giao của người khác cũng không tính
        $this->orderWithProduct(User::factory()->create(), 'delivered');
        $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])->assertStatus(403);

        $order = $this->orderWithProduct($user, 'delivered');
        $this->spa()->getJson('/api/products/den-led/reviews/eligibility')->assertJsonPath('data.can_review', true);

        $res = $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 4, 'comment' => "  Sáng tốt\nđúng mô tả  "])
            ->assertCreated()->assertJsonPath('data.verified_purchase', true)->assertJsonPath('data.is_approved', true);
        $this->assertSame("Sáng tốt\nđúng mô tả", $res->json('data.comment'));
        $this->assertDatabaseHas('product_reviews', ['user_id' => $user->id, 'order_id' => $order->id, 'rating' => 4]);

        $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 3])
            ->assertStatus(409)->assertJsonPath('code', DomainException::REVIEW_ALREADY_EXISTS);
        $this->spa()->getJson('/api/products/den-led/reviews/eligibility')
            ->assertJsonPath('data.reason', DomainException::REVIEW_ALREADY_EXISTS)->assertJsonPath('data.review.rating', 4);

        // Điểm trung bình trên catalog cập nhật
        $this->getJson('/api/products/den-led')->assertOk();
        $this->getJson('/api/products/den-led/reviews')->assertJsonPath('data.summary.count', 1);
    }

    public function test_unverified_email_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();
        $this->orderWithProduct($user, 'delivered');

        $this->actingAs($user)->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])
            ->assertStatus(403)->assertJsonPath('code', DomainException::EMAIL_NOT_VERIFIED);
    }

    public function test_validation_messages_are_vietnamese(): void
    {
        $user = $this->buyer();
        $res = $this->actingAs($user)->spa()->postJson('/api/products/den-led/reviews', ['rating' => 7, 'comment' => str_repeat('a', 2001)])
            ->assertStatus(422)->assertJsonPath('code', 'VALIDATION_ERROR');
        $this->assertStringContainsString('số sao', $res->json('errors.rating.0'));
        $this->assertStringContainsString('nội dung đánh giá', $res->json('errors.comment.0'));
    }

    public function test_images_accept_jpeg_png_webp_up_to_2mb_with_random_names(): void
    {
        $user = $this->buyer();
        $res = $this->actingAs($user)->spa()->post('/api/products/den-led/reviews', [
            'rating' => 5,
            'images' => [$this->fixture('jpg', 'anh-cua-toi.jpg'), UploadedFile::fake()->image('b.png', 50, 50), $this->fixture('webp')],
        ], ['Accept' => 'application/json'])->assertCreated();

        $urls = $res->json('data.images');
        $this->assertCount(3, $urls);
        foreach ($urls as $url) {
            $this->assertMatchesRegularExpression('#^/storage/reviews/\d{4}/\d{2}/[A-Za-z0-9]{40}\.(jpg|png|webp)$#', $url);
            $this->assertStringNotContainsString('anh-cua-toi', $url);
            Storage::disk('public')->assertExists(substr($url, strlen('/storage/')));
        }
    }

    public function test_svg_oversized_too_many_and_disguised_files_are_rejected(): void
    {
        $user = $this->buyer();
        $this->actingAs($user);
        $svg = UploadedFile::fake()->createWithContent('x.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
        $fakeJpg = UploadedFile::fake()->createWithContent('x.jpg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
        $gif = $this->fixture('gif');
        $big = UploadedFile::fake()->createWithContent('big.jpg', file_get_contents(base_path('tests/Fixtures/reviews/sample.jpg')).str_repeat("\0", 2049 * 1024));

        foreach ([$svg, $fakeJpg, $gif, $big] as $file) {
            $this->spa()->post('/api/products/den-led/reviews', ['rating' => 5, 'images' => [$file]], ['Accept' => 'application/json'])
                ->assertStatus(422)->assertJsonValidationErrors('images.0');
        }
        $four = array_map(fn ($i) => UploadedFile::fake()->image("$i.png"), range(1, 4));
        $this->spa()->post('/api/products/den-led/reviews', ['rating' => 5, 'images' => $four], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('images');

        $this->assertDatabaseCount('product_reviews', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_owner_can_update_and_delete_others_get_404_admin_can_delete_and_hide(): void
    {
        $owner = $this->buyer();
        $created = $this->actingAs($owner)->spa()->post('/api/products/den-led/reviews', [
            'rating' => 5, 'images' => [$this->fixture('jpg'), UploadedFile::fake()->image('b.png')],
        ], ['Accept' => 'application/json'])->assertCreated();
        $id = $created->json('data.id');
        [$keep, $drop] = $created->json('data.images');

        $updated = $this->spa()->post("/api/reviews/{$id}", [
            '_method' => 'PUT', 'rating' => 3, 'comment' => 'Sửa lại', 'keep_images' => [$keep],
            'images' => [UploadedFile::fake()->image('c.png')],
        ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.rating', 3);
        $this->assertCount(2, $updated->json('data.images'));
        $this->assertContains($keep, $updated->json('data.images'));
        Storage::disk('public')->assertMissing(substr($drop, strlen('/storage/')));

        // keep_images không thuộc review này bị bỏ qua
        $this->spa()->putJson("/api/reviews/{$id}", ['rating' => 3, 'keep_images' => ['reviews/../../.env']])->assertOk()->assertJsonPath('data.images', []);

        $other = User::factory()->create();
        $this->actingAs($other)->spa()->putJson("/api/reviews/{$id}", ['rating' => 1])->assertStatus(404);
        $this->actingAs($other)->spa()->deleteJson("/api/reviews/{$id}")->assertStatus(404);
        $this->actingAs($other)->spa()->patchJson("/api/admin/reviews/{$id}", ['is_approved' => false])->assertStatus(403);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->spa()->putJson("/api/reviews/{$id}", ['rating' => 1])->assertStatus(404);
        $this->actingAs($admin)->spa()->patchJson("/api/admin/reviews/{$id}", ['is_approved' => false])->assertOk()->assertJsonPath('data.is_approved', false);
        $this->getJson('/api/products/den-led/reviews')->assertJsonPath('data.summary.count', 0);
        $this->actingAs($admin)->spa()->deleteJson("/api/reviews/{$id}")->assertOk();
        $this->assertDatabaseCount('product_reviews', 0);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_review_writes_are_throttled(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user);
        for ($i = 0; $i < 5; $i++) {
            $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])->assertStatus(403);
        }
        $this->spa()->postJson('/api/products/den-led/reviews', ['rating' => 5])
            ->assertStatus(429)->assertJsonPath('code', 'TOO_MANY_REQUESTS');
    }

    private function fixture(string $ext, ?string $name = null): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name ?? "anh.$ext", file_get_contents(base_path("tests/Fixtures/reviews/sample.$ext")));
    }

    private function buyer(): User
    {
        $user = User::factory()->create();
        $this->orderWithProduct($user, 'delivered');

        return $user;
    }

    private function orderWithProduct(User $user, string $status): Order
    {
        $variant = ProductVariant::firstOrCreate(['product_id' => $this->product->id, 'sku' => 'SKU-LED'], [
            'name' => 'Mặc định', 'price' => 100000, 'stock_quantity' => 10, 'is_default' => true, 'is_active' => true,
        ]);
        $order = Order::create([
            'order_code' => 'ORD-'.strtoupper(Str::random(10)), 'user_id' => $user->id, 'status' => $status,
            'customer_name' => 'A', 'customer_phone' => '0900000000',
            'shipping_province' => 'HN', 'shipping_district' => 'BĐ', 'shipping_ward' => 'ĐB', 'shipping_address' => '1',
            'subtotal' => 100000, 'shipping_fee' => 30000, 'total_amount' => 130000,
            'delivered_at' => $status === 'delivered' ? now() : null,
        ]);
        OrderItem::create([
            'order_id' => $order->id, 'product_id' => $this->product->id, 'product_variant_id' => $variant->id,
            'product_name' => 'Đèn LED', 'variant_name' => 'Mặc định', 'sku' => 'SKU-LED',
            'unit_price' => 100000, 'quantity' => 1, 'line_total' => 100000,
        ]);

        return $order;
    }

    private function spa(): static
    {
        return $this->withCredentials()->withHeader('Origin', self::SPA)->withHeader('Referer', self::SPA.'/');
    }
}
