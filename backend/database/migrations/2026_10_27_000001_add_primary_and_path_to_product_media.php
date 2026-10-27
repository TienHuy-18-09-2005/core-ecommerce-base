<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Ảnh sản phẩm chuyển sang tải file (không nhập URL nữa):
 * - is_primary: ảnh chính (đồng bộ sang products.thumbnail_url).
 * - file_path: đường dẫn trên disk public để xóa file khi xóa ảnh; ảnh URL cũ để null (không đụng file ngoài).
 * Dữ liệu cũ giữ nguyên: sản phẩm có thumbnail_url mà chưa có dòng media → thêm 1 dòng media trỏ cùng URL;
 * ảnh có sort_order nhỏ nhất (hoặc trùng thumbnail) được đánh dấu là ảnh chính.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_media', function (Blueprint $table) {
            $table->boolean('is_primary')->default(false)->after('sort_order');
            $table->string('file_path', 500)->nullable()->after('file_url');
        });

        DB::table('product_media')->where('file_url', 'like', '/storage/products/%')->orderBy('id')
            ->each(function ($m) {
                DB::table('product_media')->where('id', $m->id)->update(['file_path' => substr($m->file_url, strlen('/storage/'))]);
            });

        DB::table('products')->whereNotNull('thumbnail_url')->where('thumbnail_url', '!=', '')->orderBy('id')
            ->each(function ($p) {
                $media = DB::table('product_media')->where('product_id', $p->id)->orderBy('sort_order')->orderBy('id')->get();
                if ($media->isEmpty()) {
                    DB::table('product_media')->insert([
                        'product_id' => $p->id, 'file_url' => $p->thumbnail_url, 'media_type' => 'image', 'sort_order' => 0, 'is_primary' => true,
                        'file_path' => str_starts_with($p->thumbnail_url, '/storage/products/') ? substr($p->thumbnail_url, strlen('/storage/')) : null,
                    ]);

                    return;
                }
                $primary = $media->firstWhere('file_url', $p->thumbnail_url) ?? $media->first();
                DB::table('product_media')->where('id', $primary->id)->update(['is_primary' => true]);
            });

        // Sản phẩm có media nhưng không có thumbnail: lấy ảnh đầu làm ảnh chính và thumbnail.
        $without = DB::table('product_media')->select('product_id')->groupBy('product_id')
            ->havingRaw('SUM(CASE WHEN is_primary THEN 1 ELSE 0 END) = 0')->pluck('product_id');
        foreach ($without as $productId) {
            $first = DB::table('product_media')->where('product_id', $productId)->orderBy('sort_order')->orderBy('id')->first();
            DB::table('product_media')->where('id', $first->id)->update(['is_primary' => true]);
            DB::table('products')->where('id', $productId)->where(fn ($q) => $q->whereNull('thumbnail_url')->orWhere('thumbnail_url', ''))
                ->update(['thumbnail_url' => $first->file_url]);
        }
    }

    public function down(): void
    {
        Schema::table('product_media', function (Blueprint $table) {
            $table->dropColumn(['is_primary', 'file_path']);
        });
    }
};
