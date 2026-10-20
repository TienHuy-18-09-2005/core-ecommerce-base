<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeValue;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Tài khoản mẫu chỉ được tạo khi mật khẩu nằm trong env. Không có mật khẩu mặc định.
        $this->call([
            AdminUserSeeder::class,
            CustomerUserSeeder::class,
        ]);

        // 2. Tạo Thương hiệu Thiết bị điện
        $brandPanasonic = Brand::create(['name' => 'Panasonic', 'slug' => 'panasonic', 'is_active' => true]);
        $brandRạngĐông = Brand::create(['name' => 'Rạng Đông', 'slug' => 'rang-dong', 'is_active' => true]);
        $brandCadivi = Brand::create(['name' => 'Cadivi', 'slug' => 'cadivi', 'is_active' => true]);

        // 3. Tạo Danh mục sản phẩm
        $catRoot = Category::create(['name' => 'Thiết bị điện', 'slug' => 'thiet-bi-dien', 'is_active' => true]);
        $catFan = Category::create(['parent_id' => $catRoot->id, 'name' => 'Quạt trần & Quạt điện', 'slug' => 'quat-tran-quat-dien', 'is_active' => true]);
        $catLight = Category::create(['parent_id' => $catRoot->id, 'name' => 'Đèn chiếu sáng LED', 'slug' => 'den-chieu-sang-led', 'is_active' => true]);
        $catWire = Category::create(['parent_id' => $catRoot->id, 'name' => 'Dây & Cáp điện', 'slug' => 'day-cap-dien', 'is_active' => true]);

        // 4. Tạo Thuộc tính động EAV (Công suất, Màu ánh sáng)
        $attrPower = Attribute::create(['name' => 'Công suất', 'code' => 'power', 'display_type' => 'button']);
        $val30W = AttributeValue::create(['attribute_id' => $attrPower->id, 'value' => '30W', 'sort_order' => 1]);
        $val50W = AttributeValue::create(['attribute_id' => $attrPower->id, 'value' => '50W', 'sort_order' => 2]);

        $attrColor = Attribute::create(['name' => 'Màu ánh sáng', 'code' => 'light_color', 'display_type' => 'color']);
        $valWhite = AttributeValue::create(['attribute_id' => $attrColor->id, 'value' => 'Trắng', 'color_hex' => '#FFFFFF', 'sort_order' => 1]);
        $valYellow = AttributeValue::create(['attribute_id' => $attrColor->id, 'value' => 'Vàng', 'color_hex' => '#FFD700', 'sort_order' => 2]);

        // 5. Tạo Sản phẩm mẫu 1: Đèn LED Panel (Có biến thể)
        $productLed = Product::create([
            'brand_id' => $brandRạngĐông->id,
            'name' => 'Đèn LED Panel Tròn Rạng Đông',
            'slug' => 'den-led-panel-tron-rang-dong',
            'short_description' => 'Đèn LED Panel âm trần tiết kiệm điện năng, ánh sáng trung thực.',
            'description' => 'Chi tiết kỹ thuật đèn LED Panel Rạng Đông dùng chiếu sáng văn phòng, nhà ở.',
            'unit' => 'cái',
            'specifications' => ['Chip LED' => 'Samsung', 'Quang thông' => '2400lm', 'Tuổi thọ' => '30.000 giờ'],
            'has_variants' => true,
            'status' => 'published',
            'is_featured' => true,
        ]);
        $productLed->categories()->attach($catLight->id);

        // Tạo biến thể cho Đèn LED
        $variant1 = ProductVariant::create([
            'product_id' => $productLed->id,
            'sku' => 'LED-PANEL-30W-W',
            'name' => '30W - Ánh sáng Trắng',
            'price' => 250000,
            'compare_at_price' => 300000,
            'stock_quantity' => 150,
            'is_default' => true,
            'is_active' => true,
        ]);
        $variant1->attributeValues()->attach([$val30W->id, $valWhite->id]);

        $variant2 = ProductVariant::create([
            'product_id' => $productLed->id,
            'sku' => 'LED-PANEL-50W-Y',
            'name' => '50W - Ánh sáng Vàng',
            'price' => 350000,
            'compare_at_price' => 400000,
            'stock_quantity' => 100,
            'is_default' => false,
            'is_active' => true,
        ]);
        $variant2->attributeValues()->attach([$val50W->id, $valYellow->id]);

        // 6. Tạo Sản phẩm mẫu 2: Dây cáp điện Cadivi (Không biến thể - bắt buộc có 1 dòng variant mặc định)
        $productWire = Product::create([
            'brand_id' => $brandCadivi->id,
            'name' => 'Dây điện đôi mềm dẹt Cadivi VCmd 2x1.5',
            'slug' => 'day-dien-doi-mem-det-cadivi-vcmd-2x1.5',
            'short_description' => 'Dây điện lực hạ thế ruột đồng cách điện PVC.',
            'description' => 'Sản phẩm chính hãng Cadivi dùng đi điện dân dụng âm tường hoặc nổi.',
            'unit' => 'cuộn',
            'specifications' => ['Tiết diện' => '2x1.5 mm2', 'Chiều dài' => '100m/cuộn'],
            'has_variants' => false,
            'status' => 'published',
            'is_featured' => true,
        ]);
        $productWire->categories()->attach($catWire->id);

        ProductVariant::create([
            'product_id' => $productWire->id,
            'sku' => 'CADIVI-VCMD-2X1.5',
            'name' => 'Mặc định',
            'price' => 480000,
            'compare_at_price' => 520000,
            'stock_quantity' => 80,
            'is_default' => true,
            'is_active' => true,
        ]);
    }
}
