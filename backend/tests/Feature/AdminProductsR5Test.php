<?php

namespace Tests\Feature;

use App\Models\AdminAuditLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** R5 Sản phẩm: hoán đổi SKU, bulk ẩn/hiện + gán danh mục, nhân bản, ảnh mô tả, lọc HTML (lưu + shop). */
class AdminProductsR5Test extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
    }

    private function product(string $slug = 'den', array $skus = ['A1', 'B1'], string $status = 'published'): Product
    {
        $p = Product::create(['name' => 'Đèn '.$slug, 'slug' => $slug, 'status' => $status]);
        foreach ($skus as $i => $sku) {
            ProductVariant::create(['product_id' => $p->id, 'sku' => $sku, 'name' => "V$i", 'price' => 1000 * ($i + 1), 'stock_quantity' => 5, 'is_default' => $i === 0, 'is_active' => true]);
        }

        return $p;
    }

    private function asSpa(User $user): static
    {
        return $this->withHeader('Origin', 'http://localhost:5173')->withCredentials()->actingAs($user);
    }

    private function save(Product $p, array $variants)
    {
        return $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}", ['name' => $p->name, 'status' => 'published', 'variants' => $variants]);
    }

    public function test_new_routes_require_admin(): void
    {
        $p = $this->product();
        $user = User::factory()->create(['role' => 'customer']);
        foreach ([['post', '/api/admin/products/bulk'], ['post', "/api/admin/products/{$p->id}/duplicate"], ['post', '/api/admin/products/description-images']] as [$m, $url]) {
            $this->asSpa($user)->json($m, $url)->assertForbidden();
        }
    }

    public function test_swapping_skus_between_two_variants_in_one_save_succeeds(): void
    {
        $p = $this->product();
        [$a, $b] = $p->variants()->orderBy('id')->get()->all();
        $this->save($p, [
            ['id' => $a->id, 'sku' => 'B1', 'name' => 'V0', 'price' => 1000, 'stock_quantity' => 5],
            ['id' => $b->id, 'sku' => 'A1', 'name' => 'V1', 'price' => 2000, 'stock_quantity' => 5],
        ])->assertOk();
        $this->assertSame('B1', $a->fresh()->sku);
        $this->assertSame('A1', $b->fresh()->sku);

        // Vòng ba chiều + đổi hoa/thường + dùng lại SKU của biến thể vừa bị bỏ
        $c = ProductVariant::create(['product_id' => $p->id, 'sku' => 'C1', 'name' => 'V2', 'price' => 1, 'stock_quantity' => 1]);
        $this->save($p, [
            ['id' => $a->id, 'sku' => 'a1', 'name' => 'V0', 'price' => 1000, 'stock_quantity' => 5],
            ['id' => $b->id, 'sku' => 'B1', 'name' => 'V1', 'price' => 2000, 'stock_quantity' => 5],
            ['sku' => 'C1', 'name' => 'Mới', 'price' => 3000, 'stock_quantity' => 1],
        ])->assertOk();
        $this->assertSame(['a1', 'B1', 'C1'], $p->variants()->orderBy('id')->pluck('sku')->all());
        $this->assertSoftDeleted('product_variants', ['id' => $c->id]);
        $this->assertStringStartsWith('C1~del', ProductVariant::withTrashed()->find($c->id)->sku);
    }

    public function test_sku_owned_by_another_product_is_still_rejected_and_nothing_changes(): void
    {
        $p = $this->product();
        $this->product('khac', ['X9']);
        [$a, $b] = $p->variants()->orderBy('id')->get()->all();
        $this->save($p, [
            ['id' => $a->id, 'sku' => 'B1', 'name' => 'V0', 'price' => 1000, 'stock_quantity' => 5],
            ['id' => $b->id, 'sku' => 'X9', 'name' => 'V1', 'price' => 2000, 'stock_quantity' => 5],
        ])->assertStatus(422)->assertJsonValidationErrors(['variants']);
        $this->assertSame(['A1', 'B1'], $p->variants()->orderBy('id')->pluck('sku')->all());
    }

    public function test_bulk_status_reports_partial_success_and_audits(): void
    {
        $a = $this->product('a', ['A'], 'draft');
        $b = $this->product('b', ['B'], 'draft');
        $b->variants()->update(['is_active' => false]);
        $this->asSpa($this->admin)->postJson('/api/admin/products/bulk', ['ids' => [$a->id, $b->id, 999], 'action' => 'status', 'status' => 'published'])
            ->assertOk()->assertJsonPath('data.succeeded', 1)->assertJsonPath('data.failed', 2)
            ->assertJsonPath('data.results.1.message', 'Không có biến thể nào đang bán.')
            ->assertJsonPath('data.results.2.message', 'Không tìm thấy sản phẩm.');
        $this->assertSame('published', $a->fresh()->status);
        $this->assertSame('draft', $b->fresh()->status);

        $this->asSpa($this->admin)->postJson('/api/admin/products/bulk', ['ids' => [$a->id], 'action' => 'status', 'status' => 'archived'])
            ->assertOk()->assertJsonPath('data.succeeded', 1);
        $this->assertSame('archived', $a->fresh()->status);
        $this->assertTrue(AdminAuditLog::where('action', 'product.updated')->where('subject_id', $a->id)->exists());

        $this->asSpa($this->admin)->postJson('/api/admin/products/bulk', ['ids' => [$a->id], 'action' => 'status'])->assertStatus(422);
    }

    public function test_bulk_add_category_keeps_existing_ones(): void
    {
        $old = Category::create(['name' => 'Cũ', 'slug' => 'cu']);
        $new = Category::create(['name' => 'Mới', 'slug' => 'moi']);
        $p = $this->product();
        $p->categories()->sync([$old->id]);
        $this->asSpa($this->admin)->postJson('/api/admin/products/bulk', ['ids' => [$p->id], 'action' => 'add_category', 'category_id' => $new->id])->assertOk();
        $this->assertEqualsCanonicalizing([$old->id, $new->id], $p->categories()->pluck('categories.id')->all());
    }

    public function test_duplicate_creates_draft_with_new_slug_skus_and_zero_stock(): void
    {
        $cat = Category::create(['name' => 'Đèn', 'slug' => 'den-cat']);
        $p = $this->product();
        $p->categories()->sync([$cat->id]);
        $res = $this->asSpa($this->admin)->postJson("/api/admin/products/{$p->id}/duplicate")->assertCreated()
            ->assertJsonPath('data.status', 'draft')->assertJsonPath('data.name', 'Đèn den (bản sao)')
            ->assertJsonPath('data.variants.0.sku', 'A1-COPY')->assertJsonPath('data.variants.0.stock_quantity', 0)
            ->assertJsonPath('data.category_ids', [$cat->id]);
        $this->assertNotSame($p->slug, $res->json('data.slug'));
        $this->asSpa($this->admin)->postJson("/api/admin/products/{$p->id}/duplicate")->assertCreated()->assertJsonPath('data.variants.0.sku', 'A1-COPY2');
    }

    public function test_list_filters_by_brand_and_returns_first_sku_and_price_range(): void
    {
        $brand = \App\Models\Brand::create(['name' => 'Rạng Đông', 'slug' => 'rang-dong']);
        $p = $this->product();
        $p->update(['brand_id' => $brand->id]);
        $this->product('khac', ['Z']);
        $this->asSpa($this->admin)->getJson("/api/admin/products?brand_id={$brand->id}")->assertOk()
            ->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.sku', 'A1')
            ->assertJsonPath('data.0.price_min', 1000)->assertJsonPath('data.0.price_max', 2000);
    }

    public function test_description_html_is_allowlisted_and_shop_renders_sanitized_copy(): void
    {
        $p = $this->product();
        $v = $p->variants()->first();
        $html = '<h2 style="color:red" class="x">Tiêu đề</h2><p>Chữ <em>nghiêng</em> <u>gạch</u></p>'
            .'<img src="/storage/products/description/a.webp" alt="ảnh" onerror="alert(1)"><img src="https://evil.test/track.gif">'
            .'<img src="/storage/../.env"><iframe src="https://x"></iframe><form><input></form><svg onload="x"></svg>'
            .'<table><tbody><tr><th colspan="2">Thông số</th></tr><tr><td>A</td><td>B</td></tr></tbody></table>'
            .'<a href="https://shop.vn" onclick="x">link</a><a href="data:text/html,x">bad</a>';
        $res = $this->asSpa($this->admin)->putJson("/api/admin/products/{$p->id}", ['name' => 'Đèn', 'status' => 'published', 'description' => $html,
            'variants' => [['id' => $v->id, 'sku' => $v->sku, 'name' => 'A', 'price' => 1, 'stock_quantity' => 1]]])->assertOk();
        $d = $res->json('data.description');
        foreach (['style=', 'class=', 'onerror', 'onclick', 'evil.test', '.env', 'iframe', '<form', '<input', 'svg', 'data:'] as $bad) {
            $this->assertStringNotContainsString($bad, $d, $bad);
        }
        foreach (['<h2>Tiêu đề</h2>', '<em>nghiêng</em>', '<u>gạch</u>', 'src="/storage/products/description/a.webp"', 'colspan="2"', 'href="https://shop.vn"', 'rel="nofollow'] as $good) {
            $this->assertStringContainsString($good, $d, $good);
        }

        // Mô tả cũ lưu thẳng DB (trước khi có bộ lọc) vẫn được lọc khi shop đọc
        Product::whereKey($p->id)->update(['description' => '<p>OK</p><script>alert(1)</script><img src=x onerror=alert(1)>']);
        $shop = $this->getJson('/api/products/den')->assertOk()->json('data.description');
        $this->assertSame('<p>OK</p>', $shop);
        $this->assertStringContainsString('<script>', Product::find($p->id)->description); // không ghi đè DB khi đọc
    }

    public function test_description_image_upload_returns_local_storage_url(): void
    {
        Storage::fake('public');
        $res = $this->asSpa($this->admin)->post('/api/admin/products/description-images', [
            'image' => UploadedFile::fake()->createWithContent('gps.jpg', file_get_contents(base_path('tests/Fixtures/reviews/gps.jpg'))),
        ], ['Accept' => 'application/json'])->assertCreated();
        $url = $res->json('data.url');
        $this->assertMatchesRegularExpression('#^/storage/products/description/[A-Za-z0-9._/-]+$#', $url);
        Storage::disk('public')->assertExists(substr($url, strlen('/storage/')));
        $this->asSpa($this->admin)->post('/api/admin/products/description-images', ['image' => UploadedFile::fake()->create('x.txt', 1, 'text/plain')], ['Accept' => 'application/json'])->assertStatus(422);
    }
}
