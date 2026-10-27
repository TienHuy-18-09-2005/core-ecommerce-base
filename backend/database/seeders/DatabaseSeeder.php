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
            RbacSeeder::class,
            AdminUserSeeder::class,
            CustomerUserSeeder::class,
        ]);

        // 2. Tạo Thương hiệu Thiết bị điện
        $brandPanasonic = Brand::updateOrCreate(['slug' => 'panasonic'], ['name' => 'Panasonic', 'is_active' => true]);
        $brandRạngĐông = Brand::updateOrCreate(['slug' => 'rang-dong'], ['name' => 'Rạng Đông', 'is_active' => true]);
        $brandCadivi = Brand::updateOrCreate(['slug' => 'cadivi'], ['name' => 'Cadivi', 'is_active' => true]);

        // 3. Tạo Danh mục sản phẩm
        $catRoot = Category::updateOrCreate(['slug' => 'thiet-bi-dien'], ['name' => 'Thiết bị điện', 'is_active' => true]);
        $catFan = Category::updateOrCreate(['slug' => 'quat-tran-quat-dien'], ['parent_id' => $catRoot->id, 'name' => 'Quạt trần & Quạt điện', 'is_active' => true]);
        $catLight = Category::updateOrCreate(['slug' => 'den-chieu-sang-led'], ['parent_id' => $catRoot->id, 'name' => 'Đèn chiếu sáng LED', 'is_active' => true]);
        $catWire = Category::updateOrCreate(['slug' => 'day-cap-dien'], ['parent_id' => $catRoot->id, 'name' => 'Dây & Cáp điện', 'is_active' => true]);

        // 4. Tạo Thuộc tính động EAV (Công suất, Màu ánh sáng)
        $attrPower = Attribute::updateOrCreate(['code' => 'power'], ['name' => 'Công suất', 'display_type' => 'button']);
        $val30W = AttributeValue::updateOrCreate(['attribute_id' => $attrPower->id, 'value' => '30W'], ['sort_order' => 1]);
        $val50W = AttributeValue::updateOrCreate(['attribute_id' => $attrPower->id, 'value' => '50W'], ['sort_order' => 2]);

        $attrColor = Attribute::updateOrCreate(['code' => 'light_color'], ['name' => 'Màu ánh sáng', 'display_type' => 'color']);
        $valWhite = AttributeValue::updateOrCreate(['attribute_id' => $attrColor->id, 'value' => 'Trắng'], ['color_hex' => '#FFFFFF', 'sort_order' => 1]);
        $valYellow = AttributeValue::updateOrCreate(['attribute_id' => $attrColor->id, 'value' => 'Vàng'], ['color_hex' => '#FFD700', 'sort_order' => 2]);

        // 5. Tạo Sản phẩm mẫu 1: Đèn LED Panel (Có biến thể)
        $productLed = Product::updateOrCreate(['slug' => 'den-led-panel-tron-rang-dong'], [
            'brand_id' => $brandRạngĐông->id,
            'name' => 'Đèn LED Panel Tròn Rạng Đông',
            'short_description' => 'Đèn LED Panel âm trần tiết kiệm điện năng, ánh sáng trung thực.',
            'description' => 'Chi tiết kỹ thuật đèn LED Panel Rạng Đông dùng chiếu sáng văn phòng, nhà ở.',
            'unit' => 'cái',
            'specifications' => ['Chip LED' => 'Samsung', 'Quang thông' => '2400lm', 'Tuổi thọ' => '30.000 giờ'],
            'has_variants' => true,
            'status' => 'published',
            'is_featured' => true,
        ]);
        $productLed->categories()->syncWithoutDetaching($catLight->id);

        // Tạo biến thể cho Đèn LED
        $variant1 = ProductVariant::updateOrCreate(['sku' => 'LED-PANEL-30W-W'], [
            'product_id' => $productLed->id,
            'name' => '30W - Ánh sáng Trắng',
            'price' => 250000,
            'compare_at_price' => 300000,
            'stock_quantity' => 150,
            'is_default' => true,
            'is_active' => true,
        ]);
        $variant1->attributeValues()->syncWithoutDetaching([$val30W->id, $valWhite->id]);

        $variant2 = ProductVariant::updateOrCreate(['sku' => 'LED-PANEL-50W-Y'], [
            'product_id' => $productLed->id,
            'name' => '50W - Ánh sáng Vàng',
            'price' => 350000,
            'compare_at_price' => 400000,
            'stock_quantity' => 100,
            'is_default' => false,
            'is_active' => true,
        ]);
        $variant2->attributeValues()->syncWithoutDetaching([$val50W->id, $valYellow->id]);

        // 6. Tạo Sản phẩm mẫu 2: Dây cáp điện Cadivi (Không biến thể - bắt buộc có 1 dòng variant mặc định)
        $productWire = Product::updateOrCreate(['slug' => 'day-dien-doi-mem-det-cadivi-vcmd-2x1.5'], [
            'brand_id' => $brandCadivi->id,
            'name' => 'Dây điện đôi mềm dẹt Cadivi VCmd 2x1.5',
            'short_description' => 'Dây điện lực hạ thế ruột đồng cách điện PVC.',
            'description' => 'Sản phẩm chính hãng Cadivi dùng đi điện dân dụng âm tường hoặc nổi.',
            'unit' => 'cuộn',
            'specifications' => ['Tiết diện' => '2x1.5 mm2', 'Chiều dài' => '100m/cuộn'],
            'has_variants' => false,
            'status' => 'published',
            'is_featured' => true,
        ]);
        $productWire->categories()->syncWithoutDetaching($catWire->id);

        ProductVariant::updateOrCreate(['sku' => 'CADIVI-VCMD-2X1.5'], [
            'product_id' => $productWire->id,
            'name' => 'Mặc định',
            'price' => 480000,
            'compare_at_price' => 520000,
            'stock_quantity' => 80,
            'is_default' => true,
            'is_active' => true,
        ]);

        // 7. Dữ liệu demo cho catalog (Pha 2) — chỉ môi trường dev, KHÔNG BAO GIỜ ở production
        if (DemoCatalogSeeder::shouldRun()) {
            $this->call(DemoCatalogSeeder::class);
        }
    }
}
