import { readAdminPref, saveAdminPref } from "./adminPrefs.ts";

/** Thông báo đơn mới: lưu tùy chọn âm thanh / đơn đã thấy theo từng tài khoản, và tiếng "bíp" bằng WebAudio. */

const soundName = (userId: number | string) => `order-sound:${userId}`;
const seenName = (userId: number | string) => `order-last-seen:${userId}`;

export const readSoundEnabled = (userId: number | string) => readAdminPref(soundName(userId)) !== "off";
export const saveSoundEnabled = (userId: number | string, on: boolean) => saveAdminPref(soundName(userId), on ? "on" : "off");
export function readLastSeen(userId: number | string): number | null {
  const v = readAdminPref(seenName(userId));
  return v === null || !/^\d+$/.test(v) ? null : Number(v);
}
export const saveLastSeen = (userId: number | string, id: number) => saveAdminPref(seenName(userId), String(id));

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function audio(): Ctx | null {
  if (ctx) return ctx;
  const AC = typeof window !== "undefined" ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
  if (!AC) return null;
  try { ctx = new AC(); } catch { return null; }
  return ctx;
}

/** Trình duyệt chỉ cho phát âm thanh sau khi người dùng tương tác: gọi trong sự kiện click/phím để "mở khóa". */
export async function unlockAudio(): Promise<boolean> {
  const c = audio();
  if (!c) return false;
  if (c.state === "suspended") { try { await c.resume(); } catch { /* vẫn bị chặn */ } }
  return c.state === "running";
}

export const audioReady = () => ctx?.state === "running";

/** Hai nốt ngắn, nhỏ (âm lượng ~0.08) — đủ nghe, không giật mình. Trả false nếu bị chặn autoplay. */
export function playBeep(): boolean {
  const c = audio();
  if (!c || c.state !== "running") return false;
  const t = c.currentTime;
  [[880, 0], [1320, 0.16]].forEach(([freq, delay]) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.08, t + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.14);
    osc.connect(gain).connect(c.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.15);
  });
  return true;
}
