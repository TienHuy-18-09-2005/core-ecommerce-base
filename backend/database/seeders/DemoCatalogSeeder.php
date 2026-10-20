<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Bộ dữ liệu demo catalog cho Pha 2: cây danh mục 3 cấp, 5 thương hiệu, 30 sản phẩm
 * (6 sản phẩm có 2 biến thể). Xác định (không random) và idempotent (chạy lại không nhân đôi).
 *
 * Bật/tắt: SEED_DEMO_DATA=true|false. Mặc định chỉ bật khi APP_ENV=local.
 * Luôn tắt khi APP_ENV=production, kể cả khi SEED_DEMO_DATA=true.
 */
class DemoCatalogSeeder extends Seeder
{
    public const PRODUCT_COUNT = 30;

    private const TREE = [
        'Đèn chiếu sáng' => ['Đèn LED Panel', 'Đèn âm trần'],
        'Dây & Cáp' => ['Dây đơn', 'Cáp điện lực'],
        'Ổ cắm & Công tắc' => ['Ổ cắm', 'Công tắc'],
    ];

    private const BRANDS = ['Rạng Đông', 'Panasonic', 'Schneider', 'Cadivi', 'Sino'];

    public const REVIEWER_COUNT = 3;

    public static function shouldRun(): bool
    {
        if (app()->environment('production')) {
            return false;
        }

        $flag = env('SEED_DEMO_DATA');
        if ($flag === null || $flag === '') {
            return app()->environment('local');
        }

        return filter_var($flag, FILTER_VALIDATE_BOOL);
    }

    public function run(): void
    {
        if (app()->environment('production')) {
            return;
        }

        $root = Category::updateOrCreate(
            ['slug' => 'thiet-bi-dien'],
            ['name' => 'Thiết bị điện', 'is_active' => true, 'sort_order' => 1],
        );

        $leaves = [];
        $order = 0;
        foreach (self::TREE as $parentName => $children) {
            $parent = Category::updateOrCreate(
                ['slug' => Str::slug($parentName)],
                ['name' => $parentName, 'parent_id' => $root->id, 'is_active' => true, 'sort_order' => ++$order],
            );
            foreach ($children as $childName) {
                $leaves[] = Category::updateOrCreate(
                    ['slug' => Str::slug($childName)],
                    ['name' => $childName, 'parent_id' => $parent->id, 'is_active' => true, 'sort_order' => ++$order],
                );
            }
        }

        $brands = [];
        foreach (self::BRANDS as $index => $brandName) {
            $brands[] = Brand::updateOrCreate(
                ['slug' => Str::slug($brandName)],
                ['name' => $brandName, 'is_active' => true, 'sort_order' => $index + 1],
            );
        }

        // Người đánh giá demo: mật khẩu ngẫu nhiên không công bố → không đăng nhập được
        $reviewers = [];
        for ($r = 1; $r <= self::REVIEWER_COUNT; $r++) {
            $reviewers[] = User::firstOrCreate(
                ['email' => "demo-reviewer-{$r}@ecom.local"],
                ['name' => "Khách đánh giá {$r}", 'password' => Hash::make(Str::random(40)), 'role' => 'customer', 'is_active' => true],
            );
        }

        for ($n = 1; $n <= self::PRODUCT_COUNT; $n++) {
            $category = $leaves[$n % count($leaves)];
            $brand = $brands[$n % count($brands)];
            $name = "{$category->name} {$brand->name} mẫu {$n}";
            $hasVariants = $n % 5 === 0;
            $price = 15000 * ((($n * 37) % 40) + 1); // 15.000đ – 600.000đ, cố định theo n

            $product = Product::updateOrCreate(
                ['slug' => Str::slug($name)],
                [
                    'brand_id' => $brand->id,
                    'name' => $name,
                    'short_description' => "Sản phẩm demo số {$n} cho môi trường phát triển.",
                    'unit' => 'cái',
                    'status' => 'published',
                    'is_featured' => $n % 6 === 0,
                    'has_variants' => $hasVariants,
                    'view_count' => ($n * 7) % 31,
                    'specifications' => ['Điện áp' => '220V', 'Bảo hành' => '12 tháng'],
                ],
            );
            $product->categories()->sync([$category->id]);

            ProductVariant::updateOrCreate(
                ['sku' => "DEMO-{$n}-A"],
                [
                    'product_id' => $product->id,
                    'name' => 'Tiêu chuẩn',
                    'price' => $price,
                    'cost_price' => intdiv($price, 2),
                    'stock_quantity' => 10 + $n,
                    'is_default' => true,
                    'is_active' => true,
                ],
            );

            if ($hasVariants) {
                ProductVariant::updateOrCreate(
                    ['sku' => "DEMO-{$n}-B"],
                    [
                        'product_id' => $product->id,
                        'name' => 'Cao cấp',
                        'price' => $price * 2,
                        'cost_price' => $price,
                        'stock_quantity' => 3,
                        'is_default' => false,
                        'is_active' => true,
                    ],
                );
            }

            $this->seedReviews($product, $n, $reviewers);
        }

        // Cây danh mục/thương hiệu được cache 24h → xoá để dữ liệu mới hiện ngay
        Cache::forget('shop_active_category_tree_v2');
        Cache::forget('shop_active_brands_v2');
    }

    /**
     * Review cố định theo n: n % 4 == 0 → chưa có review; còn lại 1–3 review đã duyệt
     * + đôi khi 1 review 1 sao CHƯA duyệt (không được tính vào điểm/bộ lọc).
     *
     * @param  array<int, User>  $reviewers
     */
    private function seedReviews(Product $product, int $n, array $reviewers): void
    {
        if ($n % 4 === 0) {
            return;
        }

        $count = ($n % 3) + 1;
        for ($i = 0; $i < $count; $i++) {
            ProductReview::updateOrCreate(
                ['product_id' => $product->id, 'user_id' => $reviewers[$i]->id],
                [
                    'rating' => (($n + $i * 2) % 5) + 1,
                    'comment' => "Đánh giá demo {$n}-{$i}.",
                    'is_approved' => true,
                ],
            );
        }

        if ($n % 7 === 0 && $count < count($reviewers)) {
            ProductReview::updateOrCreate(
                ['product_id' => $product->id, 'user_id' => $reviewers[count($reviewers) - 1]->id],
                ['rating' => 1, 'comment' => 'Đánh giá chờ duyệt.', 'is_approved' => false],
            );
        }
    }
}
