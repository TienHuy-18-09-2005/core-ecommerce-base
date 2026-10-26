import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, NEXT_THEME, readThemePref, saveThemePref, THEME_LABELS, type ThemePref } from "../../utils/theme.ts";

/** Nút đổi giao diện: Sáng → Tối → Theo hệ thống. Lưu qua utils/theme.ts. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref>(readThemePref);

  useEffect(() => {
    applyTheme(pref);
    if (pref !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [pref]);

  const next = NEXT_THEME[pref];
  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      onClick={() => {
        saveThemePref(next);
        setPref(next);
      }}
      aria-label={`Giao diện: ${THEME_LABELS[pref]}. Bấm để chuyển sang ${THEME_LABELS[next].toLowerCase()}`}
      title={`Giao diện: ${THEME_LABELS[pref]}`}
      className={`inline-flex items-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
