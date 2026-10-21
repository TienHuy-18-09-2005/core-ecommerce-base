import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const CHANNEL = "cart";
export const cartQueryKeyForSync = ["cart"] as const;

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  channel ??= new BroadcastChannel(CHANNEL);
  return channel;
}

/** Báo các tab khác rằng giỏ vừa đổi. Không gửi nội dung giỏ, chỉ tín hiệu. */
export function notifyCartChanged(): void {
  getChannel()?.postMessage({ type: "cart:changed" });
}

/** Task 3.9: refetch giỏ khi tab khác sửa giỏ hoặc khi người dùng quay lại tab. */
export function useCrossTabSync(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refetchCart = () => {
      void queryClient.invalidateQueries({ queryKey: cartQueryKeyForSync });
    };

    const listener = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
    const onMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === "object" && event.data.type === "cart:changed") {
        refetchCart();
      }
    };
    listener?.addEventListener("message", onMessage);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchCart();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      listener?.removeEventListener("message", onMessage);
      listener?.close();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [queryClient]);
}
