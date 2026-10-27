<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    }

    public static function adminRoutes(): array
    {
        return [
            ['get', '/api/admin/dashboard'],
            ['get', '/api/admin/products'],
            ['get', '/api/admin/products/1'],
            ['put', '/api/admin/products/1'],
            ['delete', '/api/admin/products/1'],
            ['post', '/api/admin/products/1/images'],
            ['put', '/api/admin/products/1/images/order'],
            ['get', '/api/admin/categories'],
            ['post', '/api/admin/categories'],
            ['put', '/api/admin/categories/1'],
            ['delete', '/api/admin/categories/1'],
            ['get', '/api/admin/coupons'],
            ['post', '/api/admin/coupons'],
            ['put', '/api/admin/coupons/1'],
            ['delete', '/api/admin/coupons/1'],
            ['get', '/api/admin/orders'],
            ['get', '/api/admin/orders/1'],
            ['get', '/api/admin/reviews'],
            ['delete', '/api/admin/reviews/1'],
        ];
    }

    #[DataProvider('adminRoutes')]
    public function test_every_admin_route_rejects_guest_customer_and_inactive_admin(string $method, string $uri): void
    {
        // Bản ghi id=1 tồn tại để route binding thành công → kiểm chứng đúng lớp phân quyền
        $p = Product::create(['name' => 'A', 'slug' => 'a', 'status' => 'published']);
        Category::create(['name' => 'A', 'slug' => 'a']);
        Coupon::create(['code' => 'A1', 'type' => 'fixed', 'value' => 1]);
        $this->makeOrder();
        ProductReview::create(['product_id' => $p->id, 'user_id' => $this->admin->id, 'rating' => 5, 'is_approved' => true]);

        $this->{$method.'Json'}($uri)->assertUnauthorized();
        $customer = User::factory()->create(['role' => 'customer']);
        $inactive = User::factory()->create(['role' => 'admin', 'is_active' => false]);
        $this->asSpa($customer)->{$method.'Json'}($uri)->assertForbidden();
        $this->asSpa($inactive)->{$method.'Json'}($uri)->assertForbidden();
    }

    public function test_product_crud_sanitizes_html_syncs_variants_and_audits(): void
    {
        $cat = Category::create(['name' => 'Đèn', 'slug' => 'den']);
        $res = $this->asSpa($this->admin)->postJson('/api/admin/products', [
            'name' => 'Đèn bàn LED',
            'description' => '<p onclick="x()">Sáng <script>alert(1)</script><a href="javascript:alert(1)">x</a><strong>tốt</strong></p>',
            'status' => 'published',
            'category_ids' => [$cat->id],
            'specifications' => ['Công suất' => '9W', 'Rỗng' => ''],
            'variants' => [
                ['sku' => 'DEN-01', 'name' => 'Trắng', 'price' => 150000, 'stock_quantity' => 10, 'cost_price' => 90000],
                ['sku' => 'DEN-02', 'name' => 'Vàng', 'price' => 160000, 'stock_quantity' => 3],
            ],
        ])->assertCreated()->assertJsonPath('data.slug', 'den-ban-led');

        $id = $res->json('data.id');
        $desc = $res->json('data.description');
        $this->assertStringNotContainsString('script', $desc);
        $this->assertStringNotContainsString('onclick', $desc);
        $this->assertStringNotContainsString('javascript:', $desc);
        $this->assertStringContainsString('<strong>tốt</strong>', $desc);
        $this->assertSame(['Công suất' => '9W'], $res->json('data.specifications'));
        $this->assertEquals(90000, $res->json('data.variants.0.cost_price'));

        $v1 = $res->json('data.variants.0.id');
        $v2 = $res->json('data.variants.1.id');
        $this->asSpa($this->admin)->putJson("/api/admin/products/$id", [
            'name' => 'Đèn bàn LED Pro',
            'status' => 'draft',
            'variants' => [
                ['id' => $v1, 'sku' => 'DEN-01', 'name' => 'Trắng', 'price' => 155000, 'stock_quantity' => 8],
                ['sku' => 'DEN-03', 'name' => 'Đen', 'price' => 170000, 'stock_quantity' => 5, 'is_default' => true],
            ],
            // trường cũ bị bỏ qua: ảnh chỉ quản lý qua /images, PUT không xóa ảnh hiện có
            'media' => [['url' => '/storage/products/a.jpg', 'alt_text' => 'Ảnh 1']],
        ])->assertOk()
            ->assertJsonPath('data.name', 'Đèn bàn LED Pro')
            ->assertJsonPath('data.slug', 'den-ban-led')
            ->assertJsonCount(2, 'data.variants')
            ->assertJsonPath('data.variants.0.sku', 'DEN-03')
            ->assertJsonCount(0, 'data.media');
        $this->assertSoftDeleted('product_variants', ['id' => $v2]);

        $this->asSpa($this->admin)->getJson('/api/admin/products?q=DEN-03')->assertOk()
            ->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.stock_total', 13);

        $this->asSpa($this->admin)->deleteJson("/api/admin/products/$id")->assertOk();
        $this->assertSoftDeleted('products', ['id' => $id]);
        $this->assertSame(
            ['product.created', 'product.updated', 'product.deleted'],
            AdminAuditLog::where('subject_type', 'Product')->orderBy('id')->pluck('action')->all()
        );
        $this->assertSame('Đèn bàn LED', AdminAuditLog::where('action', 'product.updated')->first()->changes['name'][0]);
    }

    public function test_product_rejects_duplicate_sku_foreign_variant_and_bad_urls(): void
    {
        $other = Product::create(['name' => 'Khác', 'slug' => 'khac', 'status' => 'published']);
        $foreign = ProductVariant::create(['product_id' => $other->id, 'sku' => 'TAKEN', 'name' => 'A', 'price' => 1, 'stock_quantity' => 1]);
        $p = Product::create(['name' => 'Quạt', 'slug' => 'quat', 'status' => 'draft']);

        $this->asSpa($this->admin)->postJson('/api/admin/products', ['name' => 'X', 'variants' => [['sku' => 'TAKEN', 'price' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors(['variants']);
        $base = ['name' => 'Quạt', 'status' => 'draft'];
        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}", $base + ['variants' => [['id' => $foreign->id, 'sku' => 'Q1', 'name' => 'A', 'price' => 1, 'stock_quantity' => 1]]])
            ->assertStatus(422)->assertJsonValidationErrors(['variants']);
        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}", $base + ['variants' => [
            ['sku' => 'q1', 'name' => 'A', 'price' => 1, 'stock_quantity' => 1],
            ['sku' => 'Q1', 'name' => 'B', 'price' => 1, 'stock_quantity' => 1],
        ]])->assertStatus(422)->assertJsonValidationErrors(['variants.1.sku']);
        // thumbnail_url không còn nhập tay: bị bỏ qua, không lưu
        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}", $base + [
            'thumbnail_url' => 'javascript:alert(1)',
            'variants' => [['sku' => 'Q1', 'name' => 'A', 'price' => 1, 'stock_quantity' => 1]],
        ])->assertOk()->assertJsonPath('data.thumbnail_url', null);
        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}", $base)
            ->assertStatus(422)->assertJsonPath('errors.variants.0', 'Sản phẩm cần ít nhất một biến thể.');
    }

    private function upload(Product $p, string $fixture = 'gps.jpg', string $name = 'gps.jpg')
    {
        return $this->asSpa($this->admin)->post("/api/admin/products/{$p->id}/images", [
            'image' => UploadedFile::fake()->createWithContent($name, file_get_contents(base_path("tests/Fixtures/reviews/$fixture"))),
        ], ['Accept' => 'application/json']);
    }

    public function test_product_image_upload_strips_metadata_and_fails_closed(): void
    {
        Storage::fake('public');
        $p = Product::create(['name' => 'Đèn', 'slug' => 'den', 'status' => 'published']);
        $res = $this->upload($p)->assertCreated()->assertJsonPath('data.is_primary', true);
        $media = \App\Models\ProductMedia::find($res->json('data.id'));
        $this->assertStringStartsWith('/storage/products/', $res->json('data.url'));
        $this->assertArrayNotHasKey('file_path', $res->json('data.images.0'));
        $stored = Storage::disk('public')->path($media->file_path);
        $this->assertArrayNotHasKey('GPSLatitude', @exif_read_data($stored) ?: []);
        [$w, $h] = getimagesize($stored);
        $this->assertSame([20, 40], [$w, $h]);
        $this->assertStringEndsWith('.webp', $media->file_path);
        $this->assertSame('image/webp', getimagesize($stored)['mime']);
        $this->assertSame($media->file_url, $p->fresh()->thumbnail_url);

        $this->upload($p, 'noscan.jpg', 'x.jpg')
            ->assertStatus(422)->assertJsonPath('errors.image.0', 'Ảnh không hợp lệ hoặc bị hỏng, vui lòng chọn ảnh JPEG, PNG hoặc WebP khác.');
        $this->asSpa($this->admin)->post("/api/admin/products/{$p->id}/images", ['image' => UploadedFile::fake()->create('a.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors(['image']);
        $this->assertCount(1, Storage::disk('public')->allFiles('products'));
        $this->assertSame(1, AdminAuditLog::where('action', 'product.image_added')->count());
    }

    public function test_product_images_reorder_primary_delete_and_limit(): void
    {
        Storage::fake('public');
        $p = Product::create(['name' => 'Quạt', 'slug' => 'quat', 'status' => 'published']);
        $a = $this->upload($p)->json('data.id');
        $b = $this->upload($p)->json('data.id');
        $c = $this->upload($p)->json('data.id');

        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}/images/order", ['ids' => [$c, $a, $b], 'primary_id' => $b])
            ->assertOk()->assertJsonPath('data.0.id', $c)->assertJsonPath('data.2.is_primary', true)->assertJsonPath('data.0.is_primary', false);
        $this->assertSame(\App\Models\ProductMedia::find($b)->file_url, $p->fresh()->thumbnail_url);
        // thiếu ảnh / ảnh lạ → 422
        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}/images/order", ['ids' => [$a, $b]])->assertStatus(422);
        $other = Product::create(['name' => 'Khác', 'slug' => 'khac', 'status' => 'published']);
        $x = $this->upload($other)->json('data.id');
        $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}/images/order", ['ids' => [$c, $a, $b], 'primary_id' => $x])->assertStatus(422);
        // xóa ảnh của sản phẩm khác qua URL sản phẩm này → 404 (scopeBindings)
        $this->asSpa($this->admin)->deleteJson("/api/admin/products/{$p->id}/images/$x")->assertNotFound();

        $path = \App\Models\ProductMedia::find($b)->file_path;
        $this->asSpa($this->admin)->deleteJson("/api/admin/products/{$p->id}/images/$b")->assertOk()
            ->assertJsonCount(2, 'data')->assertJsonPath('data.0.is_primary', true);
        Storage::disk('public')->assertMissing($path);
        $this->assertSame(\App\Models\ProductMedia::find($c)->file_url, $p->fresh()->thumbnail_url);

        // shop: ảnh chính đứng đầu
        $this->getJson('/api/products/quat')->assertOk()->assertJsonPath('data.media.0.id', $c);

        for ($i = 0; $i < 8; $i++) {
            \App\Models\ProductMedia::create(['product_id' => $p->id, 'file_url' => "/x$i.jpg", 'media_type' => 'image', 'sort_order' => 10 + $i]);
        }
        $this->upload($p)->assertStatus(422)->assertJsonPath('errors.image.0', 'Mỗi sản phẩm tối đa 10 ảnh.');
        $this->assertSame(
            ['product.image_added', 'product.images_reordered', 'product.image_removed'],
            AdminAuditLog::where('subject_type', 'Product')->where('subject_id', $p->id)->orderBy('id')->pluck('action')->unique()->values()->all()
        );
    }

    public function test_image_routes_reject_customers(): void
    {
        $p = Product::create(['name' => 'A', 'slug' => 'a', 'status' => 'published']);
        $m = \App\Models\ProductMedia::create(['product_id' => $p->id, 'file_url' => '/a.jpg', 'media_type' => 'image']);
        $customer = User::factory()->create(['role' => 'customer']);
        $this->asSpa($customer)->deleteJson("/api/admin/products/{$p->id}/images/{$m->id}")->assertForbidden();
        $this->assertDatabaseHas('product_media', ['id' => $m->id]);
    }

    public function test_categories_block_cycles_and_in_use_delete(): void
    {
        $root = $this->asSpa($this->admin)->postJson('/api/admin/categories', ['name' => 'Chiếu sáng'])->assertCreated()->json('data');
        $child = $this->asSpa($this->admin)->postJson('/api/admin/categories', ['name' => 'Đèn trần', 'parent_id' => $root['id']])
            ->assertCreated()->assertJsonPath('data.slug', 'den-tran')->json('data');

        $this->asSpa($this->admin)->putJson("/api/admin/categories/{$root['id']}", ['name' => 'Chiếu sáng', 'parent_id' => $child['id']])
            ->assertStatus(422)->assertJsonValidationErrors(['parent_id']);
        $this->asSpa($this->admin)->putJson("/api/admin/categories/{$root['id']}", ['name' => 'Chiếu sáng', 'parent_id' => $root['id']])
            ->assertStatus(422);
        $this->asSpa($this->admin)->deleteJson("/api/admin/categories/{$root['id']}")
            ->assertStatus(409)->assertJsonPath('code', 'CATEGORY_IN_USE');

        $this->asSpa($this->admin)->getJson('/api/admin/categories')->assertOk()
            ->assertJsonFragment(['id' => $root['id'], 'children_count' => 1]);
        $this->asSpa($this->admin)->deleteJson("/api/admin/categories/{$child['id']}")->assertOk();
        $this->asSpa($this->admin)->deleteJson("/api/admin/categories/{$root['id']}")->assertOk();
    }

    public function test_coupon_crud_validation_and_used_coupon_cannot_be_deleted(): void
    {
        $this->asSpa($this->admin)->postJson('/api/admin/coupons', ['code' => 'x', 'type' => 'percent', 'value' => 150, 'starts_at' => '2026-10-10', 'expires_at' => '2026-10-01'])
            ->assertStatus(422)->assertJsonValidationErrors(['code', 'value', 'expires_at']);

        $c = $this->asSpa($this->admin)->postJson('/api/admin/coupons', ['code' => ' giam10 ', 'type' => 'percent', 'value' => 10, 'max_discount_amount' => 50000])
            ->assertCreated()->assertJsonPath('data.code', 'GIAM10')->json('data');
        $this->asSpa($this->admin)->postJson('/api/admin/coupons', ['code' => 'GIAM10', 'type' => 'fixed', 'value' => 1])
            ->assertStatus(422)->assertJsonPath('errors.code.0', 'Mã giảm giá đã tồn tại.');

        Coupon::whereKey($c['id'])->update(['used_count' => 3]);
        $this->asSpa($this->admin)->putJson("/api/admin/coupons/{$c['id']}", ['code' => 'GIAM10', 'type' => 'percent', 'value' => 10, 'usage_limit' => 2])
            ->assertStatus(422)->assertJsonValidationErrors(['usage_limit']);
        $this->asSpa($this->admin)->putJson("/api/admin/coupons/{$c['id']}", ['code' => 'GIAM10', 'type' => 'percent', 'value' => 15, 'is_active' => false])
            ->assertOk()->assertJsonPath('data.value', 15)->assertJsonPath('data.is_active', false);
        $this->asSpa($this->admin)->deleteJson("/api/admin/coupons/{$c['id']}")
            ->assertStatus(409)->assertJsonPath('code', 'COUPON_IN_USE');

        $fresh = Coupon::create(['code' => 'XOA', 'type' => 'fixed', 'value' => 1000]);
        $this->asSpa($this->admin)->deleteJson("/api/admin/coupons/{$fresh->id}")->assertOk();
        $this->assertDatabaseMissing('coupons', ['id' => $fresh->id]);
    }

    public function test_order_transitions_are_enforced_and_logged_on_timeline(): void
    {
        $order = $this->makeOrder();
        $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'delivered'])
            ->assertStatus(409)->assertJsonPath('code', 'INVALID_STATUS_TRANSITION');

        foreach (['confirmed', 'packing', 'shipping', 'delivered'] as $s) {
            $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => $s, 'admin_note' => "ghi chú $s"])
                ->assertOk()->assertJsonPath('data.status', $s);
        }
        $detail = $this->asSpa($this->admin)->getJson("/api/admin/orders/{$order->id}")->assertOk()
            ->assertJsonPath('data.payment_status', 'paid')
            ->assertJsonPath('data.allowed_transitions', ['returned'])
            ->assertJsonPath('data.customer.phone', '0900000000')
            ->json('data');
        $this->assertSame(['pending', 'confirmed', 'packing', 'shipping', 'delivered'], array_column($detail['timeline'], 'status'));
        $this->assertSame($this->admin->name, $detail['timeline'][1]['by']);

        $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertStatus(409);

        $this->asSpa($this->admin)->getJson('/api/admin/orders?status=delivered&q=TEST0001')->assertOk()
            ->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.order_code', 'ORD-TEST0001');
        $this->asSpa($this->admin)->getJson('/api/admin/orders?from=2026-10-10&to=2026-10-01')->assertStatus(422);
    }

    public function test_cancel_restocks_once_and_releases_coupon_but_return_does_not_restock(): void
    {
        $p = Product::create(['name' => 'Ổ cắm', 'slug' => 'o-cam', 'status' => 'published']);
        $v = ProductVariant::create(['product_id' => $p->id, 'sku' => 'OC', 'name' => 'A', 'price' => 50000, 'stock_quantity' => 2]);
        $coupon = Coupon::create(['code' => 'C1', 'type' => 'fixed', 'value' => 1000, 'used_count' => 1]);

        $order = $this->makeOrder(['coupon_id' => $coupon->id]);
        $order->items()->create(['product_id' => $p->id, 'product_variant_id' => $v->id, 'product_name' => 'Ổ cắm', 'variant_name' => 'A', 'sku' => 'OC', 'unit_price' => 50000, 'quantity' => 3, 'line_total' => 150000]);

        $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled', 'cancel_reason' => 'Khách đổi ý'])
            ->assertOk()->assertJsonPath('data.cancel_reason', 'Khách đổi ý');
        $this->assertSame(5, $v->refresh()->stock_quantity);
        $this->assertSame(0, $coupon->refresh()->used_count);
        $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$order->id}/status", ['status' => 'cancelled'])->assertStatus(409);
        $this->assertSame(5, $v->refresh()->stock_quantity);

        $ret = $this->makeOrder(['order_code' => 'ORD-TEST0002', 'status' => 'shipping']);
        $ret->items()->create(['product_id' => $p->id, 'product_variant_id' => $v->id, 'product_name' => 'Ổ cắm', 'variant_name' => 'A', 'sku' => 'OC', 'unit_price' => 50000, 'quantity' => 1, 'line_total' => 50000]);
        $this->asSpa($this->admin)->patchJson("/api/admin/orders/{$ret->id}/status", ['status' => 'returned'])->assertOk();
        $this->assertSame(5, $v->refresh()->stock_quantity);
    }

    public function test_dashboard_stats(): void
    {
        $this->makeOrder(['total_amount' => 200000]);
        $this->makeOrder(['order_code' => 'ORD-TEST0002', 'status' => 'cancelled', 'total_amount' => 999999]);
        $p = Product::create(['name' => 'Bóng đèn', 'slug' => 'bong-den', 'status' => 'published']);
        ProductVariant::create(['product_id' => $p->id, 'sku' => 'BD', 'name' => 'A', 'price' => 1, 'stock_quantity' => 2]);
        ProductVariant::create(['product_id' => $p->id, 'sku' => 'BD2', 'name' => 'B', 'price' => 1, 'stock_quantity' => 50]);

        $res = $this->asSpa($this->admin)->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('data.stats.orders_total', 2)
            ->assertJsonPath('data.stats.pending_orders', 1)
            ->assertJsonPath('data.stats.low_stock_variants', 1)
            ->assertJsonPath('data.low_stock.0.sku', 'BD')
            ->assertJsonCount(14, 'data.revenue_series')
            ->assertJsonCount(2, 'data.recent_orders');
        $this->assertEquals(200000, $res->json('data.stats.revenue_today'));
        $this->assertEquals(200000, $res->json('data.revenue_series.13.revenue'));
    }

    public function test_admin_reviews_list_hide_show_delete_with_audit(): void
    {
        Storage::fake('public');
        $p = Product::create(['name' => 'Đèn', 'slug' => 'den', 'status' => 'published']);
        $u = User::factory()->create(['name' => 'Trần Văn Bình', 'email' => 'binh@example.com']);
        $r = ProductReview::create(['product_id' => $p->id, 'user_id' => $u->id, 'rating' => 2, 'comment' => '<b>tệ</b>', 'is_approved' => true]);

        $this->asSpa($this->admin)->getJson('/api/admin/reviews?q=binh@example')->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.user.email', 'binh@example.com')
            ->assertJsonPath('data.0.product.name', 'Đèn')
            ->assertJsonPath('data.0.comment', '<b>tệ</b>');

        $this->asSpa($this->admin)->patchJson("/api/admin/reviews/{$r->id}", ['is_approved' => false])->assertOk()
            ->assertJsonPath('message', 'Đã ẩn đánh giá.');
        $this->asSpa($this->admin)->getJson('/api/admin/reviews?visibility=hidden')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/products/den/reviews')->assertJsonCount(0, 'data.reviews.data');

        $this->asSpa($this->admin)->deleteJson("/api/admin/reviews/{$r->id}")->assertOk();
        $this->assertDatabaseMissing('product_reviews', ['id' => $r->id]);
        $this->assertSame(['review.hidden', 'review.deleted'], AdminAuditLog::where('subject_type', 'ProductReview')->orderBy('id')->pluck('action')->all());
    }

    private function asSpa(User $user): static
    {
        return $this->withHeader('Origin', 'http://localhost:5173')->withCredentials()->actingAs($user);
    }

    private function makeOrder(array $over = []): Order
    {
        return Order::create($over + [
            'order_code' => 'ORD-TEST0001',
            'customer_name' => 'Nguyễn A',
            'customer_phone' => '0900000000',
            'shipping_province' => 'Hà Nội',
            'shipping_district' => 'Ba Đình',
            'shipping_ward' => 'Điện Biên',
            'shipping_address' => '1 Test',
            'subtotal' => 100000,
            'discount_amount' => 0,
            'shipping_fee' => 30000,
            'total_amount' => 130000,
            'payment_method' => 'cod',
            'payment_status' => 'unpaid',
            'status' => 'pending',
        ]);
    }
}
