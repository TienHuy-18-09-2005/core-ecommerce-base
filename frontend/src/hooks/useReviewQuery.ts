import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewService, type ReviewListParams } from "../services/reviewService.ts";
import type { ReviewInput } from "../types/review.ts";

export const reviewKeys = {
  all: (slug: string) => ["reviews", slug] as const,
  list: (slug: string, params: ReviewListParams) => ["reviews", slug, "list", params] as const,
  eligibility: (slug: string, userId: number | undefined) => ["reviews", slug, "eligibility", userId] as const,
};

export function useReviewsQuery(slug: string, params: ReviewListParams) {
  return useQuery({
    queryKey: reviewKeys.list(slug, params),
    queryFn: ({ signal }) => reviewService.list(slug, params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useReviewEligibilityQuery(slug: string, userId: number | undefined) {
  return useQuery({
    queryKey: reviewKeys.eligibility(slug, userId),
    queryFn: ({ signal }) => reviewService.eligibility(slug, signal),
    enabled: userId !== undefined,
  });
}

/** Sau khi ghi: làm mới danh sách/đánh giá của tôi, và điểm trên trang sản phẩm/catalog. */
export function useReviewMutations(slug: string) {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: reviewKeys.all(slug) }),
      client.invalidateQueries({ queryKey: ["product", slug] }),
      client.invalidateQueries({ queryKey: ["products"] }),
    ]);
  };

  return {
    create: useMutation({ mutationFn: (input: ReviewInput) => reviewService.create(slug, input), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, input }: { id: number; input: ReviewInput }) => reviewService.update(id, input), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: number) => reviewService.remove(id), onSuccess: refresh }),
  };
}
