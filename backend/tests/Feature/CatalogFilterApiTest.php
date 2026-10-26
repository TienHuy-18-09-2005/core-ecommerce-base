<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogFilterApiTest extends TestCase
{
    use RefreshDatabase;

    private function product(string $name, float $price, array $extra = [], bool $variantActive = true): Product
    {
        $product = Product::create(array_merge([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'status' => 'published',
        ], $extra));
        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'SKU-'.$product->id,
            'name' => 'Mặc định',
            'price' => $price,
            'cost_price' => 1,
            'stock_quantity' => 5,
            'is_default' => true,
            'is_active' => $variantActive,
        ]);

        return $product;
    }

    public function test_invalid_filters_return_422_instead_of_500(): void
    {
        foreach ([
            'category_id=abc', 'brand_id=-1', 'min_price=x', 'sort_by=name; DROP TABLE',
            'min_price=500&max_price=100', 'min_rating=6', 'min_rating=0', 'sort_by=name', 'page=0', 'search='.str_repeat('a', 101),
        ] as $query) {
            $this->getJson('/api/products?'.$query)
                ->assertStatus(422)
                ->assertJsonPath('success', false)
                ->assertJsonPath('code', 'VALIDATION_ERROR')
                ->assertJsonStructure(['success', 'code', 'message', 'errors']);
        }
    }

    public function test_category_filter_includes_child_categories(): void
    {
        $parent = Category::create(['name' => 'Đèn', 'slug' => 'den', 'is_active' => true]);
        $child = Category::create(['name' => 'Đèn LED', 'slug' => 'den-led', 'parent_id' => $parent->id, 'is_active' => true]);
        $other = Category::create(['name' => 'Dây', 'slug' => 'day', 'is_active' => true]);
        $this->product('Đèn panel', 100)->categories()->attach($child);
        $this->product('Dây cáp', 50)->categories()->attach($other);

        $this->getJson('/api/products?category_id='.$parent->id)
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.name', 'Đèn panel');
    }

    public function test_brand_price_and_sort_filters(): void
    {
        $brand = Brand::create(['name' => 'Cadivi', 'slug' => 'cadivi', 'is_active' => true]);
        $this->product('Cáp A', 300, ['brand_id' => $brand->id]);
        $this->product('Cáp B', 100, ['brand_id' => $brand->id]);
        $this->product('Ổ cắm', 200);

        $this->getJson("/api/products?brand_id={$brand->id}&sort_by=price_asc")
            ->assertOk()
            ->assertJsonPath('data.data.0.name', 'Cáp B')
            ->assertJsonPath('data.data.1.name', 'Cáp A');

        $this->getJson('/api/products?min_price=150&max_price=250')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.name', 'Ổ cắm');
    }

    public function test_inactive_variants_do_not_match_price_filter(): void
    {
        $this->product('Ẩn giá', 10, [], false);

        $this->getJson('/api/products?max_price=20')->assertOk()->assertJsonCount(0, 'data.data');
    }

    public function test_search_escapes_like_wildcards(): void
    {
        $this->product('Đèn 100% LED', 100);
        $this->product('Ổ cắm', 100);

        $this->getJson('/api/products?search=%25')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.name', 'Đèn 100% LED');
        $this->getJson('/api/products?search=_')->assertOk()->assertJsonCount(0, 'data.data');
    }

    public function test_page_beyond_last_returns_empty_page_with_meta(): void
    {
        $this->product('Một', 1);

        $this->getJson('/api/products?page=99')
            ->assertOk()
            ->assertJsonCount(0, 'data.data')
            ->assertJsonPath('data.last_page', 1)
            ->assertJsonPath('data.total', 1);
    }

    public function test_product_detail_hides_cost_price_and_404s_unknown_slug(): void
    {
        $this->product('Đèn', 100);

        $response = $this->getJson('/api/products/den')->assertOk();
        $this->assertStringNotContainsString('cost_price', $response->getContent());

        $this->getJson('/api/products/khong-ton-tai')->assertNotFound()->assertJsonPath('success', false);
    }

    private function review(Product $product, int $rating, bool $approved = true): void
    {
        // Mỗi user chỉ 1 review / sản phẩm (unique) → mỗi review một user
        $user = \App\Models\User::factory()->create();
        \App\Models\ProductReview::create([
            'product_id' => $product->id, 'user_id' => $user->id, 'rating' => $rating, 'is_approved' => $approved,
        ]);
    }

    public function test_min_rating_uses_only_approved_reviews(): void
    {
        $good = $this->product('Tốt', 100);
        $this->review($good, 5);
        $this->review($good, 4);
        $mixed = $this->product('Trung bình', 100);
        $this->review($mixed, 3);
        $this->review($mixed, 5, false); // chưa duyệt → không tính
        $this->product('Chưa có review', 100);

        $this->getJson('/api/products?min_rating=4')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.name', 'Tốt')
            ->assertJsonPath('data.data.0.reviews_count', 2);
        $this->assertEquals(4.5, (float) $this->getJson('/api/products?min_rating=4')->json('data.data.0.avg_rating'));
        $this->getJson('/api/products?min_rating=3')->assertOk()->assertJsonCount(2, 'data.data');
    }

    public function test_sort_by_name(): void
    {
        $this->product('Bóng đèn', 1);
        $this->product('Aptomat', 1);
        $this->product('Công tắc', 1);

        $this->getJson('/api/products?sort_by=name_asc')->assertOk()->assertJsonPath('data.data.0.name', 'Aptomat');
        $this->getJson('/api/products?sort_by=name_desc')->assertOk()->assertJsonPath('data.data.0.name', 'Công tắc');
    }

    public function test_suggest_returns_small_escaped_published_set(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            $this->product("Đèn LED {$i}", 1000 * $i);
        }
        $this->product('Ổ cắm có đèn', 1);
        $this->product('Đèn 100% đồng', 1);
        Product::create(['name' => 'Đèn nháp', 'slug' => 'den-nhap', 'status' => 'draft']);

        $response = $this->getJson('/api/products/suggest?q=Đèn')->assertOk()->assertJsonPath('success', true)->assertJsonCount(8, 'data');
        $this->assertStringNotContainsString('Đèn nháp', $response->getContent());
        $this->assertStringNotContainsString('cost_price', $response->getContent());
        $this->assertSame(['id', 'name', 'slug', 'thumbnail_url', 'min_price'], array_keys($response->json('data.0')));

        $this->getJson('/api/products/suggest?q=0%25')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Đèn 100% đồng');
        $this->getJson('/api/products/suggest?q=__')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/products/suggest?q=a')->assertStatus(422)->assertJsonPath('success', false)->assertJsonPath('code', 'VALIDATION_ERROR');
        $this->getJson('/api/products/suggest')->assertStatus(422);
    }

    public function test_suggest_is_rate_limited_with_standard_error_shape(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/products/suggest?q=den')->assertOk();
        }
        $this->getJson('/api/products/suggest?q=den')
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonPath('success', false)
            ->assertJsonPath('code', 'TOO_MANY_REQUESTS');
    }

    public function test_unknown_api_route_404_has_standard_shape(): void
    {
        $this->getJson('/api/khong-co')->assertNotFound()->assertJsonPath('success', false)->assertJsonPath('code', 'NOT_FOUND');
    }
}
