<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ListAdminReviewsRequest;
use App\Http\Requests\Review\ModerateReviewRequest;
use App\Models\ProductReview;
use App\Services\Shop\ReviewService;
use App\Services\Support\AuditLogger;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function __construct(private ReviewService $reviews, private AuditLogger $audit) {}

    public function index(ListAdminReviewsRequest $request): JsonResponse
    {
        $f = $request->validated();
        $q = ProductReview::query()->with(['user:id,name,email', 'product:id,name,slug']);
        if (($f['visibility'] ?? null) !== null) {
            $q->where('is_approved', $f['visibility'] === 'visible');
        }
        if (! empty($f['rating'])) {
            $q->where('rating', $f['rating']);
        }
        if (! empty($f['q'])) {
            $term = '%'.addcslashes($f['q'], '%_\\').'%';
            $q->where(fn ($w) => $w->where('comment', 'like', $term)
                ->orWhereHas('product', fn ($p) => $p->where('name', 'like', $term))
                ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $term)->orWhere('email', 'like', $term)));
        }

        return $this->paginated(\App\Support\AdminSort::apply($q, $f, ['id' => 'id', 'rating' => 'rating', 'is_approved' => 'is_approved', 'created_at' => 'created_at'])->paginate($f['per_page'] ?? 20), fn (ProductReview $r) => $this->present($r));
    }

    public function moderate(ModerateReviewRequest $request, ProductReview $review): JsonResponse
    {
        $review->update(['is_approved' => $request->validated('is_approved')]);
        $this->audit->record($review->is_approved ? 'review.shown' : 'review.hidden', $review);

        return response()->json([
            'success' => true,
            'message' => $review->is_approved ? 'Đã hiển thị đánh giá.' : 'Đã ẩn đánh giá.',
            'data' => $this->present($review->load(['user:id,name,email', 'product:id,name,slug'])),
        ]);
    }

    public function destroy(ProductReview $review): JsonResponse
    {
        $snapshot = ['product_id' => $review->product_id, 'user_id' => $review->user_id, 'rating' => $review->rating];
        $this->reviews->delete($review);
        $this->audit->record('review.deleted', $review, $snapshot);

        return response()->json(['success' => true, 'message' => 'Đã xóa đánh giá.']);
    }

    private function present(ProductReview $r): array
    {
        // Admin thấy tên/email đầy đủ để xử lý; vẫn là văn bản thuần
        return $this->reviews->present($r, true) + [
            'product' => $r->product ? ['id' => $r->product->id, 'name' => $r->product->name, 'slug' => $r->product->slug] : null,
            'user' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email] : null,
        ];
    }
}
