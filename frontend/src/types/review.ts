export type StarKey = "5" | "4" | "3" | "2" | "1";

export interface Review {
  id: number;
  rating: number;
  /** Văn bản thuần — luôn render dạng text, không HTML. */
  comment: string | null;
  images: string[];
  author_name: string;
  verified_purchase: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Chỉ có khi là đánh giá của chính mình. */
  is_approved?: boolean;
  image_paths?: string[];
}

export interface ReviewSummary {
  average: number | null;
  count: number;
  distribution: Record<StarKey, number>;
}

export interface ReviewPage {
  data: Review[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface ReviewListResponse {
  summary: ReviewSummary;
  reviews: ReviewPage;
}

export type ReviewIneligibleReason = "REVIEW_ALREADY_EXISTS" | "EMAIL_NOT_VERIFIED" | "REVIEW_NOT_PURCHASED";

export interface ReviewEligibility {
  can_review: boolean;
  reason: ReviewIneligibleReason | null;
  review: Review | null;
}

export interface ReviewInput {
  rating: number;
  comment: string;
  images: File[];
  /** Khi sửa: URL ảnh cũ muốn giữ. */
  keepImages?: string[];
}
