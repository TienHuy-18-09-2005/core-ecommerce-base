<?php

namespace App\Services\Shop;

use App\Exceptions\DomainException;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Đánh giá sản phẩm (Pha 5).
 *
 * Quyết định: chỉ user đã xác thực email và có ít nhất 1 đơn ĐÃ GIAO (status = delivered)
 * chứa sản phẩm mới được đánh giá; mỗi user 1 đánh giá / sản phẩm. Đánh giá của người mua
 * đã xác minh được duyệt ngay (is_approved = true); admin có thể ẩn/xoá.
 */
class ReviewService
{
    public const DISK = 'public';

    public const DIR = 'reviews';

    public function findPublishedProduct(string $slug): Product
    {
        $product = Product::query()->published()->where('slug', $slug)->first(['id', 'slug', 'name']);
        if (! $product) {
            throw new DomainException(DomainException::PRODUCT_UNAVAILABLE, 'Không tìm thấy sản phẩm.', 404);
        }

        return $product;
    }

    /** @return array{average: float|null, count: int, distribution: array<string, int>} */
    public function summary(Product $product): array
    {
        $rows = ProductReview::query()->approved()->where('product_id', $product->id)
            ->selectRaw('rating, COUNT(*) as total')->groupBy('rating')->pluck('total', 'rating');

        $distribution = [];
        $count = 0;
        $sum = 0;
        for ($star = 5; $star >= 1; $star--) {
            $n = (int) ($rows[$star] ?? 0);
            $distribution[(string) $star] = $n;
            $count += $n;
            $sum += $n * $star;
        }

        return [
            'average' => $count > 0 ? round($sum / $count, 1) : null,
            'count' => $count,
            'distribution' => $distribution,
        ];
    }

    public function paginate(Product $product, ?int $rating, int $perPage): LengthAwarePaginator
    {
        return ProductReview::query()->approved()->where('product_id', $product->id)
            ->when($rating, fn ($q) => $q->where('rating', $rating))
            ->with('user:id,name')
            ->latest()->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (ProductReview $r) => $this->present($r));
    }

    /** @return array{can_review: bool, reason: string|null, review: array<string, mixed>|null} */
    public function eligibility(User $user, Product $product): array
    {
        $existing = ProductReview::query()->where('product_id', $product->id)->where('user_id', $user->id)->first();
        if ($existing) {
            return ['can_review' => false, 'reason' => DomainException::REVIEW_ALREADY_EXISTS, 'review' => $this->present($existing->load('user:id,name'), true)];
        }
        if (! $user->hasVerifiedEmail()) {
            return ['can_review' => false, 'reason' => DomainException::EMAIL_NOT_VERIFIED, 'review' => null];
        }
        if (! $this->deliveredOrderId($user, $product)) {
            return ['can_review' => false, 'reason' => DomainException::REVIEW_NOT_PURCHASED, 'review' => null];
        }

        return ['can_review' => true, 'reason' => null, 'review' => null];
    }

    /**
     * @param  array{rating: int, comment?: string|null, images?: array<int, UploadedFile>}  $data
     */
    public function create(User $user, Product $product, array $data): ProductReview
    {
        if (! $user->hasVerifiedEmail()) {
            throw new DomainException(DomainException::EMAIL_NOT_VERIFIED, 'Vui lòng xác thực email trước khi đánh giá.', 403);
        }
        $orderId = $this->deliveredOrderId($user, $product);
        if (! $orderId) {
            throw new DomainException(DomainException::REVIEW_NOT_PURCHASED, 'Chỉ khách đã mua và nhận sản phẩm này mới được đánh giá.', 403);
        }
        if (ProductReview::query()->where('product_id', $product->id)->where('user_id', $user->id)->exists()) {
            throw $this->alreadyReviewed();
        }

        $paths = $this->storeImages($data['images'] ?? []);
        try {
            return ProductReview::create([
                'product_id' => $product->id,
                'user_id' => $user->id,
                'order_id' => $orderId,
                'rating' => $data['rating'],
                'comment' => $this->cleanComment($data['comment'] ?? null),
                'images' => $paths ?: null,
                'is_approved' => true,
            ])->load('user:id,name');
        } catch (QueryException $e) {
            // Hai request song song: unique (product_id, user_id) chặn bản thứ hai
            $this->deleteImages($paths);
            throw $this->alreadyReviewed();
        }
    }

    /**
     * @param  array{rating: int, comment?: string|null, images?: array<int, UploadedFile>, keep_images?: array<int, string>}  $data
     */
    public function update(ProductReview $review, array $data): ProductReview
    {
        $current = $review->images ?? [];
        $keep = array_values(array_intersect($current, $this->pathsFromInput($data['keep_images'] ?? [])));
        $new = $data['images'] ?? [];
        if (count($keep) + count($new) > \App\Http\Requests\Review\StoreReviewRequest::MAX_IMAGES) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'images' => 'Mỗi đánh giá tối đa '.\App\Http\Requests\Review\StoreReviewRequest::MAX_IMAGES.' ảnh.',
            ]);
        }

        $added = $this->storeImages($new);
        $removed = array_values(array_diff($current, $keep));

        DB::transaction(function () use ($review, $data, $keep, $added) {
            $images = array_merge($keep, $added);
            $review->update([
                'rating' => $data['rating'],
                'comment' => $this->cleanComment($data['comment'] ?? null),
                'images' => $images ?: null,
            ]);
        });
        $this->deleteImages($removed);

        return $review->refresh()->load('user:id,name');
    }

    public function delete(ProductReview $review): void
    {
        $paths = $review->images ?? [];
        $review->delete();
        $this->deleteImages($paths);
    }

    /** @return array<string, mixed> */
    public function present(ProductReview $review, bool $owner = false): array
    {
        $out = [
            'id' => $review->id,
            'rating' => $review->rating,
            // Văn bản thuần; FE render qua text node, không dùng HTML
            'comment' => $review->comment,
            'images' => array_map(fn (string $p) => $this->url($p), $review->images ?? []),
            'author_name' => $this->maskName($review->user?->name),
            'verified_purchase' => $review->order_id !== null,
            'created_at' => $review->created_at?->toIso8601String(),
            'updated_at' => $review->updated_at?->toIso8601String(),
        ];
        if ($owner) {
            $out['is_approved'] = $review->is_approved;
            $out['image_paths'] = $review->images ?? [];
        }

        return $out;
    }

    private function deliveredOrderId(User $user, Product $product): ?int
    {
        return Order::query()
            ->where('user_id', $user->id)
            ->where('status', 'delivered')
            ->whereHas('items', fn ($q) => $q->where('product_id', $product->id))
            ->orderByDesc('delivered_at')->orderByDesc('id')
            ->value('id');
    }

    private function alreadyReviewed(): DomainException
    {
        return new DomainException(DomainException::REVIEW_ALREADY_EXISTS, 'Bạn đã đánh giá sản phẩm này. Hãy sửa đánh giá cũ.', 409);
    }

    private function cleanComment(?string $comment): ?string
    {
        if ($comment === null) {
            return null;
        }
        // Bỏ ký tự điều khiển (giữ xuống dòng), lưu nguyên văn bản — không lọc HTML vì FE không render HTML
        $comment = trim(preg_replace('/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/u', '', $comment) ?? '');

        return $comment === '' ? null : $comment;
    }

    /**
     * Mã hoá lại mọi ảnh (JPEG/PNG/WebP) bằng GD để bỏ toàn bộ metadata (EXIF/GPS/ICC/dữ liệu chèn sau ảnh),
     * xoay theo EXIF Orientation trước khi bỏ. Fail closed: ảnh nào không mã hoá lại được → 422, không lưu file gốc.
     *
     * @param  array<int, UploadedFile>  $files
     * @return array<int, string>
     */
    private function storeImages(array $files): array
    {
        $encoded = [];
        foreach (array_values($files) as $i => $file) {
            $mime = $file->getMimeType();
            $ext = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                default => null,
            };
            $bytes = $ext === null ? null : $this->reencode($file->getRealPath(), $mime);
            if ($bytes === null) {
                throw ValidationException::withMessages([
                    "images.$i" => 'Ảnh không hợp lệ hoặc bị hỏng, vui lòng chọn ảnh JPEG, PNG hoặc WebP khác.',
                ]);
            }
            $encoded[] = [$ext, $bytes];
        }

        $paths = [];
        foreach ($encoded as [$ext, $bytes]) {
            $path = self::DIR.'/'.now()->format('Y/m').'/'.Str::random(40).'.'.$ext;
            Storage::disk(self::DISK)->put($path, $bytes);
            $paths[] = $path;
        }

        return $paths;
    }

    private function reencode(string $source, string $mime): ?string
    {
        $img = match ($mime) {
            'image/jpeg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($source) : false,
            'image/png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($source) : false,
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source) : false,
            default => false,
        };
        if (! $img) {
            return null;
        }
        if ($mime === 'image/jpeg') {
            $img = $this->applyOrientation($img, $source);
        }
        ob_start();
        $ok = match ($mime) {
            'image/jpeg' => imagejpeg($img, null, 85),
            'image/png' => imagesavealpha($img, true) && imagepng($img, null, 6),
            'image/webp' => imagesavealpha($img, true) && imagewebp($img, null, 85),
        };
        $out = ob_get_clean();
        imagedestroy($img);

        return $ok && $out ? $out : null;
    }

    private function applyOrientation(\GdImage $img, string $source): \GdImage
    {
        $o = function_exists('exif_read_data') ? (int) (@exif_read_data($source)['Orientation'] ?? 1) : 1;
        if (in_array($o, [2, 4, 5, 7], true)) {
            imageflip($img, IMG_FLIP_HORIZONTAL);
        }
        $angle = match ($o) {
            3, 4 => 180,
            5, 6 => 270, // imagerotate quay ngược chiều kim đồng hồ
            7, 8 => 90,
            default => 0,
        };
        if ($angle) {
            $rot = imagerotate($img, $angle, 0);
            if ($rot) {
                imagedestroy($img);
                $img = $rot;
            }
        }

        return $img;
    }

    /** @param array<int, string> $paths */
    private function deleteImages(array $paths): void
    {
        foreach ($paths as $p) {
            if (str_starts_with($p, self::DIR.'/')) {
                Storage::disk(self::DISK)->delete($p);
            }
        }
    }

    /** Chấp nhận cả đường dẫn lưu trữ lẫn URL công khai mà FE nhận được. @param array<int, string> $input @return array<int, string> */
    private function pathsFromInput(array $input): array
    {
        return array_map(function (string $v) {
            $pos = strpos($v, '/storage/');

            return $pos !== false ? substr($v, $pos + strlen('/storage/')) : $v;
        }, $input);
    }

    private function url(string $path): string
    {
        // URL tương đối để dùng được qua proxy Vite lẫn nginx
        return '/storage/'.ltrim($path, '/');
    }

    private function maskName(?string $name): string
    {
        $name = trim((string) $name);
        if ($name === '') {
            return 'Khách hàng';
        }
        $parts = preg_split('/\s+/u', $name) ?: [$name];
        $last = array_pop($parts);

        // "Nguyễn Văn An" → "N. V. An": không lộ họ tên đầy đủ
        return $parts ? implode(' ', array_map(fn ($p) => mb_strtoupper(mb_substr($p, 0, 1)).'.', $parts)).' '.$last : $last;
    }
}
