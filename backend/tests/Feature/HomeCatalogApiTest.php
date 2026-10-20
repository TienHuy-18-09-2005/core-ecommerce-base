<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class HomeCatalogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_categories_are_returned_as_an_active_tree(): void
    {
        $root = Category::create([
            'name' => 'Thiết bị điện',
            'slug' => 'thiet-bi-dien',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        Category::create([
            'parent_id' => $root->id,
            'name' => 'Đèn LED',
            'slug' => 'den-led',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        Category::create([
            'name' => 'Ẩn',
            'slug' => 'an',
            'is_active' => false,
            'sort_order' => 0,
        ]);
        $inactiveParent = Category::create([
            'name' => 'Ngừng bán',
            'slug' => 'ngung-ban',
            'is_active' => false,
            'sort_order' => 2,
        ]);
        Category::create([
            'parent_id' => $inactiveParent->id,
            'name' => 'Con của mục ẩn',
            'slug' => 'con-an',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $response = $this->getJson('/api/categories');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Thiết bị điện')
            ->assertJsonPath('data.0.children.0.name', 'Đèn LED')
            ->assertJsonPath('data.0.children.0.children', []);

        $this->assertStringNotContainsString('Ẩn', $response->getContent());
        $this->assertStringNotContainsString('Con của mục ẩn', $response->getContent());

        $cached = Cache::get('shop_active_category_tree_v2');
        $this->assertIsArray($cached);
        $restored = unserialize(serialize($cached), ['allowed_classes' => false]);
        $this->assertSame('Đèn LED', $restored[0]['children'][0]['name']);
    }

    public function test_brands_return_only_active_rows(): void
    {
        Brand::create(['name' => 'Cadivi', 'slug' => 'cadivi', 'is_active' => true, 'sort_order' => 2]);
        Brand::create(['name' => 'Panasonic', 'slug' => 'panasonic', 'is_active' => true, 'sort_order' => 1]);
        Brand::create(['name' => 'Ẩn', 'slug' => 'an', 'is_active' => false, 'sort_order' => 0]);

        $this->getJson('/api/brands')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.name', 'Panasonic')
            ->assertJsonPath('data.1.name', 'Cadivi')
            ->assertJsonMissing(['name' => 'Ẩn']);
    }

    public function test_products_can_be_filtered_by_featured_and_per_page_is_capped(): void
    {
        Product::create([
            'name' => 'Đèn nổi bật',
            'slug' => 'den-noi-bat',
            'status' => 'published',
            'is_featured' => true,
        ]);
        Product::create([
            'name' => 'Dây thường',
            'slug' => 'day-thuong',
            'status' => 'published',
            'is_featured' => false,
        ]);

        $this->getJson('/api/products?is_featured=1')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.name', 'Đèn nổi bật')
            ->assertJsonPath('data.data.0.is_featured', true)
            ->assertJsonPath('data.data.0.default_variant_id', null);

        $this->getJson('/api/products?per_page=1000')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.per_page', 48)
            ->assertJsonCount(2, 'data.data');
    }
}
