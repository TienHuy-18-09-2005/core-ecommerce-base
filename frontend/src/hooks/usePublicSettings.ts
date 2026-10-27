import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient.ts";

/** R7: thông tin công khai do admin cấu hình (tên/SĐT/địa chỉ cửa hàng, phí ship). */
export interface PublicSettings {
  store: { name: string | null; phone: string | null; address: string | null; email?: string | null };
  shipping: { fee: number; free_threshold: number | null };
}

export const publicSettingsKey = ["settings", "public"] as const;

export const usePublicSettings = () =>
  useQuery({
    queryKey: publicSettingsKey,
    queryFn: async ({ signal }) => (await apiClient.get<{ data: PublicSettings }>("/settings/public", { signal })).data.data,
    staleTime: 5 * 60_000,
  });
