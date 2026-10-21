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

    // Dùng CHUNG object với notifyCartChanged: BroadcastChannel không giao tin cho chính object gửi,
    // nên tab hiện tại không tự refetch vì tin của chính nó
    const listener = getChannel();
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
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [queryClient]);
}

// ---------- 4.9: đồng bộ đăng nhập/đăng xuất giữa các tab ----------

export type AuthEvent = "login" | "logout";

let authChannel: BroadcastChannel | null = null;

function getAuthChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }
  authChannel ??= new BroadcastChannel("auth");
  return authChannel;
}

export function notifyAuthChanged(type: AuthEvent): void {
  getAuthChannel()?.postMessage({ type });
}

export function useAuthBroadcast(onEvent: (type: AuthEvent) => void): void {
  useEffect(() => {
    const listener = getAuthChannel();
    if (!listener) {
      return;
    }
    const onMessage = (event: MessageEvent) => {
      const type = event.data && typeof event.data === "object" ? event.data.type : null;
      if (type === "login" || type === "logout") {
        onEvent(type);
      }
    };
    listener.addEventListener("message", onMessage);
    return () => {
      listener.removeEventListener("message", onMessage);
    };
  }, [onEvent]);
}
