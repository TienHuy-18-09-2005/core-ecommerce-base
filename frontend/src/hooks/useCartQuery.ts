import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { cartService } from "../services/cartService.ts";
import { useToast } from "../app/useToast.ts";
import type { Cart } from "../types/cart.ts";
import { notifyCartChanged } from "./useCrossTabSync.ts";

export const cartQueryKey = ["cart"] as const;

export function useCartQuery() {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: () => cartService.getCart(),
    // Giỏ hàng luôn lấy mới để số lượng/giá chính xác
    staleTime: 0,
  });
}

/**
 * Bỏ qua response cũ: mỗi lần ghi giỏ được đánh số; chỉ response của lần ghi MỚI NHẤT
 * được ghi vào cache. Response đến trễ của lần ghi trước bị bỏ qua.
 */
let latestWrite = 0;

export function nextCartWrite(): number {
  latestWrite += 1;
  return latestWrite;
}

export function applyCartResponse(queryClient: QueryClient, writeId: number, cart: Cart): boolean {
  if (writeId !== latestWrite) {
    return false;
  }
  queryClient.setQueryData(cartQueryKey, cart);
  notifyCartChanged();
  return true;
}

function useCartWrite<TInput>(
  run: (input: TInput) => Promise<Cart>,
  successMessage?: string,
  onDone?: (cart: Cart) => void,
) {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();

  return useMutation({
    mutationFn: async (input: TInput) => {
      const writeId = nextCartWrite();
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const cart = await run(input);
      return { writeId, cart };
    },
    onSuccess: ({ writeId, cart }) => {
      applyCartResponse(queryClient, writeId, cart);
      if (successMessage) {
        showSuccess(successMessage);
      }
      onDone?.(cart);
    },
    onError: async (error) => {
      showError(error);
      // Trạng thái server có thể khác FE (vd. hết hàng) → lấy lại giỏ
      await queryClient.invalidateQueries({ queryKey: cartQueryKey });
    },
  });
}

export function useAddToCartMutation(options: { onAdded?: (cart: Cart) => void } = {}) {
  return useCartWrite(
    (input: { productVariantId: number; quantity: number }) =>
      cartService.addToCart(input.productVariantId, input.quantity),
    "Đã thêm vào giỏ hàng",
    options.onAdded,
  );
}

export function useUpdateCartItemMutation() {
  return useCartWrite((input: { itemId: number; quantity: number }) =>
    cartService.updateQuantity(input.itemId, input.quantity),
  );
}

export function useRemoveCartItemMutation() {
  return useCartWrite((itemId: number) => cartService.removeItem(itemId), "Đã xóa sản phẩm khỏi giỏ hàng");
}
