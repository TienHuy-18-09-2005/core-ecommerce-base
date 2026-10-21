<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoCatalogSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        putenv('SEED_DEMO_DATA');
        unset($_ENV['SEED_DEMO_DATA'], $_SERVER['SEED_DEMO_DATA']);
        parent::tearDown();
    }

    private function setFlag(string $value): void
    {
        putenv("SEED_DEMO_DATA={$value}");
        $_ENV['SEED_DEMO_DATA'] = $_SERVER['SEED_DEMO_DATA'] = $value;
    }

    public function test_seeds_deterministic_catalog_and_is_idempotent(): void
    {
        $this->seed(DemoCatalogSeeder::class);
        $this->seed(DemoCatalogSeeder::class);

        $this->assertSame(30, Product::count());
        $this->assertSame(36, ProductVariant::count());
        $this->assertSame(5, Brand::count());
        $this->assertSame(10, Category::count());
        $this->assertSame(
            15000 * (((1 * 37) % 40) + 1),
            (int) ProductVariant::where('sku', 'DEMO-1-A')->value('price'),
        );

        $this->getJson('/api/products?per_page=12')->assertOk()->assertJsonPath('data.last_page', 3);
        $parent = Category::where('slug', 'den-chieu-sang')->firstOrFail();
        $this->getJson('/api/products?category_id='.$parent->id)->assertOk()->assertJsonPath('data.total', 10);
        $this->getJson('/api/products?min_price=100000&max_price=200000')->assertOk();

        $reviews = \App\Models\ProductReview::count();
        $this->assertGreaterThan(0, $reviews);
        $this->assertGreaterThan(0, \App\Models\ProductReview::where('is_approved', false)->count());
        $this->seed(DemoCatalogSeeder::class);
        $this->assertSame($reviews, \App\Models\ProductReview::count());
        $four = $this->getJson('/api/products?min_rating=4&per_page=48')->assertOk()->json('data.total');
        $one = $this->getJson('/api/products?min_rating=1&per_page=48')->assertOk()->json('data.total');
        $this->assertGreaterThan(0, $four);
        $this->assertGreaterThan($four, $one);
        $this->assertLessThan(30, $one); // sản phẩm chưa có review bị loại
    }

    public function test_never_runs_in_production_even_with_flag(): void
    {
        $this->setFlag('true');
        $this->app['env'] = 'production';
        $this->assertFalse(DemoCatalogSeeder::shouldRun());
        (new DemoCatalogSeeder)->run();
        $this->assertSame(0, Product::count());
    }

    public function test_flag_controls_non_production_environments(): void
    {
        $this->app['env'] = 'local';
        $this->assertTrue(DemoCatalogSeeder::shouldRun());
        $this->setFlag('false');
        $this->assertFalse(DemoCatalogSeeder::shouldRun());

        $this->app['env'] = 'staging';
        $this->setFlag('true');
        $this->assertTrue(DemoCatalogSeeder::shouldRun());
    }

    public function test_database_seeder_is_idempotent_and_skips_demo_when_disabled(): void
    {
        $this->setFlag('false');
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(2, Product::count());
    }
}
