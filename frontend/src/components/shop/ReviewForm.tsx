import { useEffect, useMemo, useState, type FormEvent } from "react";
import { StarRating } from "../common/StarRating.tsx";
import { useToast } from "../../app/useToast.ts";
import { useReviewMutations } from "../../hooks/useReviewQuery.ts";
import { ApiError } from "../../services/apiError.ts";
import {
  REVIEW_COMMENT_MAX,
  REVIEW_IMAGE_TYPES,
  REVIEW_MAX_IMAGES,
  validateReviewImages,
} from "../../services/reviewService.ts";
import type { Review } from "../../types/review.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

interface Props {
  slug: string;
  /** Có review cũ → chế độ sửa. */
  existing?: Review | null;
  onDone?: () => void;
  onCancel?: () => void;
}

/** Gom lỗi images.0, images.1… về một dòng "images". */
function fieldErrorsOf(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fieldErrors) return {};
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const field = key.startsWith("images") || key.startsWith("keep_images") ? "images" : key;
    out[field] ??= messages[0];
  }
  return out;
}

export function ReviewForm({ slug, existing, onDone, onCancel }: Props) {
  const { showSuccess, showError } = useToast();
  const { create, update } = useReviewMutations(slug);
  const mutation = existing ? update : create;

  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [keep, setKeep] = useState<string[]>(existing?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const onPickFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const next = [...files, ...picked];
    const problem = validateReviewImages(next, keep.length);
    if (problem) {
      setErrors((e) => ({ ...e, images: problem }));
      return;
    }
    setErrors(({ images: _drop, ...rest }) => rest);
    setFiles(next);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const local: Record<string, string> = {};
    if (rating < 1) local.rating = "Vui lòng chọn số sao.";
    if (comment.length > REVIEW_COMMENT_MAX) local.comment = `Nội dung tối đa ${REVIEW_COMMENT_MAX} ký tự.`;
    const imageProblem = validateReviewImages(files, keep.length);
    if (imageProblem) local.images = imageProblem;
    setErrors(local);
    if (Object.keys(local).length) return;

    const input = { rating, comment: comment.trim(), images: files, keepImages: keep };
    const options = {
      onSuccess: () => {
        showSuccess(existing ? "Đã cập nhật đánh giá." : "Cảm ơn bạn đã đánh giá sản phẩm.");
        setFiles([]);
        onDone?.();
      },
      onError: (error: unknown) => {
        const fields = fieldErrorsOf(error);
        setErrors(fields);
        if (!Object.keys(fields).length) showError(error);
      },
    };
    if (existing) update.mutate({ id: existing.id, input }, options);
    else create.mutate(input, options);
  };

  const remaining = REVIEW_MAX_IMAGES - keep.length - files.length;

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border bg-slate-50 p-4" aria-label={existing ? "Sửa đánh giá" : "Viết đánh giá"}>
      <StarRating value={rating} onChange={setRating} size="lg" error={errors.rating} />

      <label className="block text-sm font-medium">
        Nhận xét
        <textarea
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={REVIEW_COMMENT_MAX}
          rows={4}
          placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm (không bắt buộc)"
          aria-invalid={errors.comment ? true : undefined}
          aria-describedby={errors.comment ? "comment-error" : undefined}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <span className="mt-1 block text-right text-xs text-slate-500">{comment.length}/{REVIEW_COMMENT_MAX}</span>
        {errors.comment ? <span id="comment-error" className="block text-xs text-red-700">{errors.comment}</span> : null}
      </label>

      <div>
        <span id="images-label" className="block text-sm font-medium">
          Ảnh thực tế (JPEG, PNG, WebP; tối đa {REVIEW_MAX_IMAGES} ảnh, mỗi ảnh ≤ 2MB)
        </span>
        {/* Input gốc ẩn (sr-only, vẫn focus được bằng bàn phím); nút hiển thị tiếng Việt thay "Choose Files" */}
        <div className="mt-1 flex items-center gap-3">
          <label
            className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus-within:ring-2 focus-within:ring-blue-500 hover:bg-slate-50 ${remaining <= 0 ? "cursor-not-allowed opacity-50" : ""}`}
          >
            Chọn ảnh
            <input
              type="file"
              name="images"
              multiple
              accept={REVIEW_IMAGE_TYPES.join(",")}
              disabled={remaining <= 0}
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
              aria-labelledby="images-label"
              aria-invalid={errors.images ? true : undefined}
              aria-describedby={`images-status${errors.images ? " images-error" : ""}`}
              className="sr-only"
            />
          </label>
          <span id="images-status" className="text-sm text-slate-500" aria-live="polite">
            {keep.length + files.length === 0 ? "Chưa chọn ảnh nào" : `Đã chọn ${keep.length + files.length}/${REVIEW_MAX_IMAGES} ảnh`}
          </span>
        </div>
        {errors.images ? <span id="images-error" role="alert" className="mt-1 block text-xs text-red-700">{errors.images}</span> : null}
        <ul className="mt-2 flex flex-wrap gap-2">
          {keep.map((url) => (
            <li key={url} className="relative">
              <img src={safeImageUrl(url) ?? undefined} alt="Ảnh đã đăng" className="h-20 w-20 rounded object-cover" />
              <button type="button" onClick={() => setKeep(keep.filter((k) => k !== url))} className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 text-xs shadow" aria-label="Bỏ ảnh đã đăng">✕</button>
            </li>
          ))}
          {previews.map(({ file, url }) => (
            <li key={url} className="relative">
              <img src={url} alt={`Ảnh mới: ${file.name}`} className="h-20 w-20 rounded object-cover" />
              <button type="button" onClick={() => setFiles(files.filter((f) => f !== file))} className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 text-xs shadow" aria-label={`Bỏ ảnh ${file.name}`}>✕</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={mutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60">
          {mutation.isPending ? "Đang gửi..." : existing ? "Lưu đánh giá" : "Gửi đánh giá"}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2">Huỷ</button>
        ) : null}
      </div>
    </form>
  );
}
