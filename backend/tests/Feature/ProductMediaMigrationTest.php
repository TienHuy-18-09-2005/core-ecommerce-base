<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Migration ảnh: dữ liệu URL cũ giữ nguyên, có ảnh chính, thumbnail được tạo thành dòng media. */
class ProductMediaMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_backfill_keeps_existing_url_images(): void
    {
        $migration = require database_path('migrations/2026_10_27_000001_add_primary_and_path_to_product_media.php');
        $migration->down();

        $onlyThumb = Product::create(['name' => 'A', 'slug' => 'a', 'status' => 'published', 'thumbnail_url' => 'https://cdn.example.com/a.jpg']);
        $withMedia = Product::create(['name' => 'B', 'slug' => 'b', 'status' => 'published', 'thumbnail_url' => '/storage/products/b2.webp']);
        $noThumb = Product::create(['name' => 'C', 'slug' => 'c', 'status' => 'published']);
        DB::table('product_media')->insert([
            ['product_id' => $withMedia->id, 'file_url' => '/storage/products/b1.webp', 'media_type' => 'image', 'sort_order' => 0],
            ['product_id' => $withMedia->id, 'file_url' => '/storage/products/b2.webp', 'media_type' => 'image', 'sort_order' => 1],
            ['product_id' => $noThumb->id, 'file_url' => 'https://cdn.example.com/c.jpg', 'media_type' => 'image', 'sort_order' => 0],
        ]);

        $migration->up();

        $a = DB::table('product_media')->where('product_id', $onlyThumb->id)->get();
        $this->assertCount(1, $a);
        $this->assertSame('https://cdn.example.com/a.jpg', $a[0]->file_url);
        $this->assertTrue((bool) $a[0]->is_primary);
        $this->assertNull($a[0]->file_path);

        $b = DB::table('product_media')->where('product_id', $withMedia->id)->orderBy('sort_order')->get();
        $this->assertSame([false, true], $b->map(fn ($m) => (bool) $m->is_primary)->all());
        $this->assertSame('products/b1.webp', $b[0]->file_path);

        $this->assertTrue((bool) DB::table('product_media')->where('product_id', $noThumb->id)->value('is_primary'));
        $this->assertSame('https://cdn.example.com/c.jpg', $noThumb->fresh()->thumbnail_url);
    }
}
