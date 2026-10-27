<?php

namespace App\Http\Controllers\Shop;

use App\Http\Controllers\Controller;
use App\Http\Requests\Review\ListReviewsRequest;
use App\Http\Requests\Review\ModerateReviewRequest;
use App\Http\Requests\Review\StoreReviewRequest;
use App\Http\Requests\Review\UpdateReviewRequest;
use App\Models\ProductReview;
use App\Services\Shop\ReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ReviewController extends Controller
{
    public function __construct(private readonly ReviewService $reviews) {}

    public function index(ListReviewsRequest $request, string $slug): JsonResponse
    {
        $product = $this->reviews->findPublishedProduct($slug);
        $data = $request->validated();

        return response()->json([
            'success' => true,
            'data' => [
                'summary' => $this->reviews->summary($product),
                'reviews' => $this->reviews->paginate($product, isset($data['rating']) ? (int) $data['rating'] : null, (int) ($data['per_page'] ?? 5)),
            ],
        ]);
    }

    public function eligibility(Request $request, string $slug): JsonResponse
    {
        $product = $this->reviews->findPublishedProduct($slug);

        return response()->json(['success' => true, 'data' => $this->reviews->eligibility($request->user(), $product)]);
    }

    public function store(StoreReviewRequest $request, string $slug): JsonResponse
    {
        $product = $this->reviews->findPublishedProduct($slug);
        $review = $this->reviews->create($request->user(), $product, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Cảm ơn bạn đã đánh giá sản phẩm.',
            'data' => $this->reviews->present($review, true),
        ], 201);
    }

    public function update(UpdateReviewRequest $request, ProductReview $review): JsonResponse
    {
        Gate::authorize('update', $review);
        $review = $this->reviews->update($review, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật đánh giá.',
            'data' => $this->reviews->present($review, true),
        ]);
    }

    public function destroy(ProductReview $review): JsonResponse
    {
        Gate::authorize('delete', $review);
        $this->reviews->delete($review);

        return response()->json(['success' => true, 'message' => 'Đã xóa đánh giá.']);
    }

    /** Admin ẩn/hiện đánh giá. */
    public function moderate(ModerateReviewRequest $request, ProductReview $review): JsonResponse
    {
        $review->update(['is_approved' => $request->validated('is_approved')]);

        return response()->json([
            'success' => true,
            'message' => $review->is_approved ? 'Đã hiển thị đánh giá.' : 'Đã ẩn đánh giá.',
            'data' => $this->reviews->present($review->load('user:id,name'), true),
        ]);
    }
}
