import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../app/useAuth.ts";
import { useToast } from "../../app/useToast.ts";
import { useReviewEligibilityQuery, useReviewMutations, useReviewsQuery } from "../../hooks/useReviewQuery.ts";
import { errorMessage } from "../../utils/fieldErrors.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";
import type { Review, ReviewEligibility, ReviewSummary, StarKey } from "../../types/review.ts";
import { StarRating } from "../common/StarRating.tsx";
import { ReviewForm } from "./ReviewForm.tsx";

const STARS: StarKey[] = ["5", "4", "3", "2", "1"];

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "";
}

export function ReviewSection({ slug }: { slug: string }) {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState<number | null>(null);
  const query = useReviewsQuery(slug, { page, rating });
  const { user } = useAuth();
  // Đánh giá của tôi đã hiện ở ô riêng → bỏ khỏi danh sách chung (dùng chung cache eligibility)
  const myReviewId = useReviewEligibilityQuery(slug, user?.id).data?.review?.id;
  const reviews = query.data?.reviews.data.filter((r) => r.id !== myReviewId) ?? [];

  const filter = (star: number | null) => {
    setRating(star);
    setPage(1);
  };

  return (
    <section className="mt-12 rounded-xl border bg-white p-6 shadow-sm" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="mb-4 text-xl font-bold text-gray-900">Đánh giá sản phẩm</h2>

      {query.isPending ? <p aria-busy="true" className="text-slate-500">Đang tải đánh giá...</p> : null}
      {query.isError ? (
        <div role="alert" className="text-red-700">
          {errorMessage(query.error, "Không tải được đánh giá.")}{" "}
          <button type="button" className="underline" onClick={() => query.refetch()}>Thử lại</button>
        </div>
      ) : null}

      {query.data ? (
        <>
          <Summary summary={query.data.summary} active={rating} onFilter={filter} />
          <MyReview slug={slug} />

          {rating !== null ? (
            <p className="mt-6 text-sm text-slate-600">
              Đang lọc: {rating} sao.{" "}
              <button type="button" className="text-blue-700 underline" onClick={() => filter(null)}>Xem tất cả</button>
            </p>
          ) : null}

          {reviews.length === 0 ? (
            <p className="mt-6 text-slate-500">{rating ? "Chưa có đánh giá nào với số sao này." : "Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này."}</p>
          ) : (
            <ul className="mt-6 divide-y divide-slate-200" aria-label="Danh sách đánh giá">
              {reviews.map((review) => <ReviewItem key={review.id} review={review} />)}
            </ul>
          )}

          {query.data.reviews.last_page > 1 ? (
            <nav className="mt-4 flex items-center gap-3" aria-label="Phân trang đánh giá">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-1 disabled:opacity-50">Trước</button>
              <span className="text-sm">Trang {query.data.reviews.current_page}/{query.data.reviews.last_page}</span>
              <button type="button" disabled={page >= query.data.reviews.last_page} onClick={() => setPage(page + 1)} className="rounded border px-3 py-1 disabled:opacity-50">Sau</button>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Summary({ summary, active, onFilter }: { summary: ReviewSummary; active: number | null; onFilter: (star: number | null) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-[180px_1fr]">
      <div className="text-center">
        <p className="text-4xl font-bold text-slate-900">{summary.average !== null ? summary.average.toLocaleString("vi-VN", { minimumFractionDigits: 1 }) : "–"}</p>
        <StarRating value={summary.average ?? 0} />
        <p className="text-sm text-slate-500">{summary.count} đánh giá</p>
      </div>
      <ul className="space-y-1" aria-label="Phân bổ số sao">
        {STARS.map((star) => {
          const n = summary.distribution[star] ?? 0;
          const pct = summary.count ? Math.round((n / summary.count) * 100) : 0;
          const selected = active === Number(star);
          return (
            <li key={star}>
              <button
                type="button"
                onClick={() => onFilter(selected ? null : Number(star))}
                aria-pressed={selected}
                disabled={n === 0 && !selected}
                aria-label={`${star} sao: ${n} đánh giá`}
                className={`flex w-full items-center gap-2 rounded px-1 text-sm disabled:cursor-default ${selected ? "bg-amber-50" : ""}`}
              >
                <span className="w-10 text-left">{star} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-200">
                  <span className="block h-full bg-amber-500" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 text-right text-slate-600">{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-900">{review.author_name}</span>
        {review.verified_purchase ? <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Đã mua hàng</span> : null}
        <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
      </div>
      <StarRating value={review.rating} size="lg" />
      {/* Text thuần: React escape mọi ký tự, không dùng HTML */}
      {review.comment ? <p className="mt-1 whitespace-pre-line break-words text-slate-800">{review.comment}</p> : null}
      <ReviewImages images={review.images} />
    </li>
  );
}

function ReviewImages({ images }: { images: string[] }) {
  const safe = images.map(safeImageUrl).filter((u): u is string => Boolean(u));
  if (!safe.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {safe.map((url, i) => (
        <li key={url}>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt={`Ảnh đánh giá ${i + 1}`} loading="lazy" decoding="async" width={80} height={80} className="h-20 w-20 rounded object-cover" />
          </a>
        </li>
      ))}
    </ul>
  );
}

const REASON_TEXT: Record<string, string> = {
  EMAIL_NOT_VERIFIED: "Vui lòng xác thực email để viết đánh giá.",
  REVIEW_NOT_PURCHASED: "Chỉ khách đã mua và nhận sản phẩm này mới có thể đánh giá.",
};

function MyReview({ slug }: { slug: string }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const eligibility = useReviewEligibilityQuery(slug, user?.id);

  if (isLoading) return null;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <p className="mt-6 text-sm text-slate-600">
        <Link to={`/dang-nhap?redirect=${redirect}`} className="font-semibold text-blue-700 underline">Đăng nhập</Link> để viết đánh giá (dành cho khách đã mua sản phẩm).
      </p>
    );
  }
  if (eligibility.isPending) return null;
  if (eligibility.isError) return <p role="alert" className="mt-6 text-sm text-red-700">{errorMessage(eligibility.error)}</p>;
  return <MyReviewBody slug={slug} data={eligibility.data} />;
}

function MyReviewBody({ slug, data }: { slug: string; data: ReviewEligibility }) {
  const [mode, setMode] = useState<"idle" | "write" | "edit">("idle");
  const { remove } = useReviewMutations(slug);
  const { showSuccess, showError } = useToast();

  if (data.review) {
    const review = data.review;
    if (mode === "edit") {
      return <div className="mt-6"><ReviewForm key={review.id} slug={slug} existing={review} onDone={() => setMode("idle")} onCancel={() => setMode("idle")} /></div>;
    }
    return (
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-900">Đánh giá của bạn{review.is_approved === false ? " (đang bị ẩn)" : ""}</p>
        <StarRating value={review.rating} size="lg" />
        {review.comment ? <p className="mt-1 whitespace-pre-line break-words">{review.comment}</p> : null}
        <ReviewImages images={review.images} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setMode("edit")} className="rounded-lg border bg-white px-3 py-1 text-sm">Sửa</button>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => {
              if (!window.confirm("Xoá đánh giá này?")) return;
              remove.mutate(review.id, { onSuccess: () => showSuccess("Đã xoá đánh giá."), onError: showError });
            }}
            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-sm text-red-700"
          >
            Xoá
          </button>
        </div>
      </div>
    );
  }

  if (!data.can_review) {
    return <p className="mt-6 text-sm text-slate-600">{REASON_TEXT[data.reason ?? ""] ?? "Bạn chưa thể đánh giá sản phẩm này."}</p>;
  }
  if (mode === "write") {
    return <div className="mt-6"><ReviewForm slug={slug} onDone={() => setMode("idle")} onCancel={() => setMode("idle")} /></div>;
  }
  return (
    <button type="button" onClick={() => setMode("write")} className="mt-6 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white">
      Viết đánh giá
    </button>
  );
}
