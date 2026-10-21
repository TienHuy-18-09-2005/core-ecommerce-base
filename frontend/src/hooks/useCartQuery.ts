import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartService } from "../services/cartService.ts";
import { useToast } from "../app/useToast.ts";

export const cartQueryKey = ["cart"] as const;

export function useCartQuery() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: () => cartService.getCart(),
    // Giỏ hàng luôn lấy mới để số lượng/giá chính xác
    staleTime: 0,
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  return useMutation({
    mutationFn: (input: { productVariantId: number; quantity: number }) =>
      cartService.addToCart(input.productVariantId, input.quantity),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
      showSuccess("Đã thêm vào giỏ hàng");
    },
    onError: (error) => {
      showError(error);
    },
  });
}
