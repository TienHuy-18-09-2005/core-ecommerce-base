<?php

namespace App\Services\Admin;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Services\Support\AuditLogger;
use App\Services\Support\HtmlSanitizer;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AdminProductService
{
    public const LOW_STOCK = 5;

    private const AUDITED = ['name', 'slug', 'status', 'is_featured', 'brand_id', 'thumbnail_url', 'unit'];

    public function __construct(private HtmlSanitizer $html, private AuditLogger $audit) {}

    public function list(array $f): LengthAwarePaginator
    {
        $q = Product::query()->with(['brand:id,name', 'categories:id,name'])
            ->withSum('variants as stock_total', 'stock_quantity')
            ->withMin('variants as price_min', 'price')
            ->withMax('variants as price_max', 'price')
            ->withCount('variants')
            ->addSelect(['first_sku' => ProductVariant::select('sku')->whereColumn('product_id', 'products.id')
                ->orderByDesc('is_default')->orderBy('id')->limit(1)]);
        if (! empty($f['q'])) {
            $term = '%'.addcslashes($f['q'], '%_\\').'%';
            $q->where(fn ($w) => $w->where('name', 'like', $term)
                ->orWhereHas('variants', fn ($v) => $v->where('sku', 'like', $term)));
        }
        if (! empty($f['status'])) {
            $q->where('status', $f['status']);
        }
        if (! empty($f['category_id'])) {
            $q->whereHas('categories', fn ($c) => $c->where('categories.id', $f['category_id']));
        }
        if (! empty($f['brand_id'])) {
            $q->where('brand_id', $f['brand_id']);
        }
        if (! empty($f['low_stock'])) {
            $q->whereHas('variants', fn ($v) => $v->where('is_active', true)->where('stock_quantity', '<=', self::LOW_STOCK));
        }
        // Giá trị cũ newest/oldest/stock vẫn nhận để không phá hợp đồng
        $legacy = ['newest' => ['id', 'desc'], 'oldest' => ['id', 'asc'], 'stock' => ['stock_total', 'asc']];
        if (isset($legacy[$f['sort'] ?? ''])) {
            [$f['sort'], $f['direction']] = [$legacy[$f['sort']][0], $f['direction'] ?? $legacy[$f['sort']][1]];
        }
        \App\Support\AdminSort::apply($q, $f, ['id' => 'id', 'name' => 'name', 'price_min' => 'price_min', 'stock_total' => 'stock_total', 'status' => 'status', 'updated_at' => 'updated_at']);

        return $q->paginate($f['per_page'] ?? 20);
    }

    public function summary(Product $p): array
    {
        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'status' => $p->status,
            'is_featured' => (bool) $p->is_featured,
            'thumbnail_url' => $p->thumbnail_url,
            'brand' => $p->brand ? ['id' => $p->brand->id, 'name' => $p->brand->name] : null,
            'categories' => $p->categories->map(fn ($c) => ['id' => $c->id, 'name' => $c->name])->values()->all(),
            'price_min' => $p->price_min !== null ? (float) $p->price_min : null,
            'price_max' => $p->price_max !== null ? (float) $p->price_max : null,
            'sku' => $p->first_sku,
            'stock_total' => (int) ($p->stock_total ?? 0),
            'variants_count' => (int) ($p->variants_count ?? 0),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    public function detail(Product $p): array
    {
        $p->load(['brand:id,name', 'categories:id,name', 'media', 'variants' => fn ($v) => $v->orderByDesc('is_default')->orderBy('id')]);

        return [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'status' => $p->status,
            'is_featured' => (bool) $p->is_featured,
            'brand_id' => $p->brand_id,
            'category_ids' => $p->categories->pluck('id')->all(),
            'short_description' => $p->short_description,
            'description' => $p->description,
            'thumbnail_url' => $p->thumbnail_url,
            'unit' => $p->unit,
            'specifications' => $p->specifications ?: (object) [],
            'meta_title' => $p->meta_title,
            'meta_description' => $p->meta_description,
            'media' => app(ProductImageService::class)->present($p),
            'variants' => $p->variants->map(fn (ProductVariant $v) => [
                'id' => $v->id,
                'sku' => $v->sku,
                'name' => $v->name,
                'price' => (float) $v->price,
                'compare_at_price' => $v->compare_at_price !== null ? (float) $v->compare_at_price : null,
                'cost_price' => $v->cost_price !== null ? (float) $v->cost_price : null, // chỉ admin thấy
                'stock_quantity' => (int) $v->stock_quantity,
                'weight_grams' => (int) $v->weight_grams,
                'image_url' => $v->image_url,
                'is_default' => (bool) $v->is_default,
                'is_active' => (bool) $v->is_active,
            ])->values()->all(),
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    /** Giữ nguyên hợp đồng cũ (POST tối giản chỉ cần name); thêm sanitize + kiểm SKU trùng. */
    public function createProductWithVariants(array $data): Product
    {
        $variants = $data['variants'] ?? [];
        $this->assertSkusAvailable(array_column($variants, 'sku'), []);

        return DB::transaction(function () use ($data, $variants) {
            $product = Product::create($this->productFields($data) + [
                'slug' => $this->uniqueSlug($data['slug'] ?? null, $data['name']),
                'has_variants' => count($variants) > 1,
                'status' => $data['status'] ?? 'draft',
                'is_featured' => $data['is_featured'] ?? false,
            ]);
            $product->categories()->sync($data['category_ids'] ?? []);

            if ($variants) {
                foreach (array_values($variants) as $i => $v) {
                    $variant = $product->variants()->create($this->variantFields($v, $product) + [
                        'sku' => $v['sku'] ?? $this->randomSku(),
                        'is_default' => $i === 0,
                    ]);
                    if (! empty($v['attribute_value_ids'])) {
                        $variant->attributeValues()->attach($v['attribute_value_ids']);
                    }
                }
            } else {
                // Luôn có ít nhất 1 biến thể mặc định
                $product->variants()->create([
                    'sku' => $this->randomSku(), 'name' => 'Mặc định', 'price' => $data['price'] ?? 0,
                    'stock_quantity' => $data['stock_quantity'] ?? 0, 'is_default' => true, 'is_active' => true,
                ]);
            }
            $this->audit->record('product.created', $product, ['name' => $product->name]);

            return $product->load(['variants', 'categories', 'brand']);
        });
    }

    public function update(Product $product, array $data): Product
    {
        $existing = $product->variants()->pluck('id')->all();
        $ids = array_values(array_filter(array_column($data['variants'], 'id')));
        if ($foreign = array_diff($ids, $existing)) {
            throw ValidationException::withMessages(['variants' => 'Biến thể #'.implode(', #', $foreign).' không thuộc sản phẩm này.']);
        }
        $this->assertSkusAvailable(array_column($data['variants'], 'sku'), $existing);

        return DB::transaction(function () use ($product, $data, $existing, $ids) {
            $before = $product->only(self::AUDITED);
            $slug = ($data['slug'] ?? null) && $data['slug'] !== $product->slug
                ? $this->uniqueSlug($data['slug'], $data['name'], $product->id)
                : $product->slug;
            $product->update($this->productFields($data) + [
                'slug' => $slug,
                'status' => $data['status'],
                'is_featured' => $data['is_featured'] ?? $product->is_featured,
                'has_variants' => count($data['variants']) > 1,
            ]);
            $product->categories()->sync($data['category_ids'] ?? []);

            // Sửa lỗi hoán đổi SKU: unique index kiểm từng câu UPDATE, nên A↔B trong một lần lưu sẽ va nhau.
            // Bước 1: biến thể bị bỏ → xóa mềm; nếu SKU của nó được dùng lại trong form thì đổi SKU cũ sang dạng lưu trữ.
            $removed = array_diff($existing, $ids);
            $wanted = array_map('mb_strtolower', array_column($data['variants'], 'sku'));
            foreach (ProductVariant::whereIn('id', $removed ?: [0])->get() as $gone) {
                if (in_array(mb_strtolower($gone->sku), $wanted, true)) {
                    $gone->forceFill(['sku' => mb_substr($gone->sku, 0, 80).'~del'.$gone->id])->saveQuietly();
                }
                $gone->delete();
            }
            // Bước 2: biến thể giữ lại nhưng đổi SKU → đặt SKU tạm (duy nhất) trước, rồi mới ghi SKU mới ở bước 3.
            $current = ProductVariant::whereIn('id', $ids ?: [0])->pluck('sku', 'id');
            foreach ($data['variants'] as $v) {
                if (! empty($v['id']) && $current[$v['id']] !== $v['sku']) {
                    ProductVariant::whereKey($v['id'])->update(['sku' => '~tmp'.$v['id'].'-'.Str::random(8)]);
                }
            }

            $defaultIdx = collect($data['variants'])->search(fn ($v) => ! empty($v['is_default']));
            $defaultIdx = $defaultIdx === false ? 0 : $defaultIdx;
            foreach (array_values($data['variants']) as $i => $v) {
                $fields = $this->variantFields($v, $product) + ['sku' => $v['sku'], 'is_default' => $i === $defaultIdx];
                if (! empty($v['id'])) {
                    ProductVariant::whereKey($v['id'])->first()->update($fields);
                } else {
                    $product->variants()->create($fields);
                }
            }

            $changes = app(AuditLogger::class)->diff($before, $product->only(self::AUDITED));
            if ($removed) {
                $changes['variants_removed'] = array_values($removed);
            }
            $this->audit->record('product.updated', $product, $changes ?: null);

            return $product->refresh();
        });
    }

    /**
     * Hàng loạt: đổi trạng thái (ẩn/hiện) hoặc gán thêm danh mục. Thành công từng phần — trả kết quả từng sản phẩm.
     *
     * @param  int[]  $ids
     * @return array{succeeded:int, failed:int, results: array<int, array{id:int, name:?string, ok:bool, message:?string}>}
     */
    public function bulk(array $ids, string $action, ?string $status, ?int $categoryId): array
    {
        $products = Product::whereIn('id', $ids)->get()->keyBy('id');
        $results = [];
        foreach ($ids as $id) {
            $p = $products->get($id);
            if (! $p) {
                $results[] = ['id' => $id, 'name' => null, 'ok' => false, 'message' => 'Không tìm thấy sản phẩm.'];

                continue;
            }
            try {
                DB::transaction(function () use ($p, $action, $status, $categoryId) {
                    if ($action === 'status') {
                        if ($status === 'published' && ! $p->variants()->where('is_active', true)->exists()) {
                            throw ValidationException::withMessages(['status' => 'Không có biến thể nào đang bán.']);
                        }
                        $before = $p->status;
                        $p->update(['status' => $status]);
                        $this->audit->record('product.updated', $p, ['status' => ['from' => $before, 'to' => $status], 'bulk' => true]);
                    } else {
                        $p->categories()->syncWithoutDetaching([$categoryId]);
                        $this->audit->record('product.updated', $p, ['category_added' => $categoryId, 'bulk' => true]);
                    }
                });
                $results[] = ['id' => $id, 'name' => $p->name, 'ok' => true, 'message' => null];
            } catch (ValidationException $e) {
                $results[] = ['id' => $id, 'name' => $p->name, 'ok' => false, 'message' => collect($e->errors())->flatten()->first()];
            }
        }
        $ok = count(array_filter($results, fn ($r) => $r['ok']));

        return ['succeeded' => $ok, 'failed' => count($results) - $ok, 'results' => $results];
    }

    /** Nhân bản: bản nháp mới, slug/SKU mới, tồn kho về 0; không chép ảnh (tránh hai sản phẩm chung một file). */
    public function duplicate(Product $src): Product
    {
        $src->load(['variants' => fn ($v) => $v->orderByDesc('is_default')->orderBy('id'), 'categories:id']);

        return DB::transaction(function () use ($src) {
            $name = mb_substr($src->name, 0, 240).' (bản sao)';
            $copy = Product::create([
                'brand_id' => $src->brand_id, 'name' => $name, 'slug' => $this->uniqueSlug(null, $name),
                'short_description' => $src->short_description, 'description' => $this->html->clean($src->description),
                'unit' => $src->unit, 'specifications' => $src->specifications, 'meta_title' => $src->meta_title,
                'meta_description' => $src->meta_description, 'has_variants' => $src->has_variants,
                'status' => 'draft', 'is_featured' => false,
            ]);
            $copy->categories()->sync($src->categories->pluck('id')->all());
            foreach ($src->variants as $v) {
                $copy->variants()->create([
                    'sku' => $this->copySku($v->sku), 'name' => $v->name, 'price' => $v->price,
                    'compare_at_price' => $v->compare_at_price, 'cost_price' => $v->cost_price, 'stock_quantity' => 0,
                    'weight_grams' => $v->weight_grams, 'image_url' => null, 'is_default' => $v->is_default, 'is_active' => $v->is_active,
                ]);
            }
            $this->audit->record('product.duplicated', $copy, ['from' => $src->id]);

            return $copy;
        });
    }

    private function copySku(string $sku): string
    {
        $base = mb_substr($sku, 0, 90).'-COPY';
        $try = $base;
        $n = 2;
        while (ProductVariant::withTrashed()->where('sku', $try)->exists()) {
            $try = $base.$n++;
        }

        return $try;
    }

    public function delete(Product $product): void
    {
        DB::transaction(function () use ($product) {
            // Xóa mềm: ẩn khỏi shop, đơn cũ giữ snapshot
            $product->variants()->delete();
            $product->delete();
            $this->audit->record('product.deleted', $product, ['name' => $product->name]);
        });
    }

    private function productFields(array $d): array
    {
        return [
            'brand_id' => $d['brand_id'] ?? null,
            'name' => $d['name'],
            'short_description' => isset($d['short_description']) ? strip_tags($d['short_description']) : null,
            'description' => $this->html->clean($d['description'] ?? null),
            'unit' => $d['unit'] ?? 'cái',
            'specifications' => $this->cleanSpecs($d['specifications'] ?? null),
            'meta_title' => $d['meta_title'] ?? null,
            'meta_description' => $d['meta_description'] ?? null,
        ];
    }

    private function variantFields(array $v, Product $product): array
    {
        return [
            'name' => $v['name'] ?? 'Mặc định',
            'price' => $v['price'],
            'compare_at_price' => $v['compare_at_price'] ?? null,
            'cost_price' => $v['cost_price'] ?? null,
            'stock_quantity' => $v['stock_quantity'] ?? 0,
            'weight_grams' => $v['weight_grams'] ?? 0,
            'image_url' => $v['image_url'] ?? null,
            'is_active' => $v['is_active'] ?? true,
        ];
    }

    private function cleanSpecs(?array $specs): ?array
    {
        if (! $specs) {
            return null;
        }
        $out = [];
        foreach ($specs as $k => $v) {
            $k = trim(strip_tags((string) $k));
            if ($k !== '' && $v !== null && trim((string) $v) !== '') {
                $out[mb_substr($k, 0, 100)] = trim(strip_tags((string) $v));
            }
        }

        return $out ?: null;
    }

    /** SKU unique toàn bảng (kể cả biến thể đã xóa mềm vì unique index không phân biệt). */
    private function assertSkusAvailable(array $skus, array $ownVariantIds): void
    {
        $skus = array_values(array_filter($skus));
        if (! $skus) {
            return;
        }
        $taken = ProductVariant::withTrashed()->whereIn('sku', $skus)->whereNotIn('id', $ownVariantIds ?: [0])->pluck('sku')->all();
        if ($taken) {
            throw ValidationException::withMessages(['variants' => 'SKU đã tồn tại: '.implode(', ', $taken).'.']);
        }
    }

    private function uniqueSlug(?string $wanted, string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($wanted ?: $name) ?: 'san-pham';
        $slug = $base;
        $n = 2;
        while (Product::withTrashed()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))->exists()) {
            $slug = $base.'-'.$n++;
        }

        return $slug;
    }

    private function randomSku(): string
    {
        return 'SKU-'.strtoupper(Str::random(8));
    }
}
