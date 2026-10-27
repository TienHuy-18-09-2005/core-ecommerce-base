import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../app/useToast.ts";
import { adminService } from "../services/adminService.ts";
import { audioReady, playBeep, readLastSeen, readSoundEnabled, saveLastSeen, saveSoundEnabled, unlockAudio } from "../utils/orderAlerts.ts";
import { adminKeys } from "./useAdminQuery.ts";

export const ORDER_POLL_MS = 30_000;

/**
 * Polling đơn mới mỗi 30s (dừng khi tab ẩn — refetchIntervalInBackground=false).
 * Chỉ báo khi thật sự có đơn mới hơn đơn cuối đã thấy (lưu trong trình duyệt theo user → tải lại trang không báo lại).
 * Lần đầu (chưa có mốc) chỉ ghi mốc, không báo dồn đơn cũ.
 */
export function useOrderNotifier(userId: number | undefined) {
  const toast = useToast();
  const navigate = useNavigate();
  const uid = userId ?? 0;
  const [soundOn, setSoundOn] = useState(() => readSoundEnabled(uid));
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const hinted = useRef(false);

  useEffect(() => { setSoundOn(readSoundEnabled(uid)); }, [uid]);

  // Lần tương tác đầu tiên trên trang sẽ mở khóa âm thanh (quy định autoplay của trình duyệt).
  useEffect(() => {
    const onGesture = () => { void unlockAudio(); };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return () => { window.removeEventListener("pointerdown", onGesture); window.removeEventListener("keydown", onGesture); };
  }, []);

  const { data } = useQuery({
    queryKey: adminKeys.latestOrders,
    queryFn: ({ signal }) => adminService.latestOrders(readLastSeen(uid), signal),
    enabled: userId !== undefined,
    refetchInterval: ORDER_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!data || userId === undefined) return;
    const seen = readLastSeen(uid);
    if (seen === null || data.latest_id < seen) { saveLastSeen(uid, data.latest_id); return; }
    if (data.latest_id === seen || data.new_count <= 0) return;
    saveLastSeen(uid, data.latest_id);
    toast.showInfo(`Có ${data.new_count} đơn hàng mới`, { action: { label: "Xem", onClick: () => navigate("/admin/don-hang?status=pending") } });
    if (!soundRef.current) return;
    if (!playBeep() && !audioReady() && !hinted.current) {
      hinted.current = true;
      toast.showInfo("Bấm để bật âm thanh thông báo", { action: { label: "Bật âm thanh", onClick: () => { void unlockAudio().then((ok) => ok && playBeep()); } } });
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSound = useCallback(() => {
    const next = !soundRef.current;
    saveSoundEnabled(uid, next);
    setSoundOn(next);
    if (next) void unlockAudio().then((ok) => ok && playBeep());
  }, [uid]);

  return { pendingCount: data?.pending_count ?? null, soundOn, toggleSound };
}
