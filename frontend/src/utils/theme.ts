export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "theme";

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Áp theme lên <html> (cùng logic với script inline trong index.html). */
export function applyTheme(pref: ThemePref): boolean {
  const dark = pref === "dark" || (pref === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark;
}

export function saveThemePref(pref: ThemePref): void {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* chế độ riêng tư: chỉ áp dụng trong phiên */
  }
}

export const NEXT_THEME: Record<ThemePref, ThemePref> = { light: "dark", dark: "system", system: "light" };
export const THEME_LABELS: Record<ThemePref, string> = { light: "Sáng", dark: "Tối", system: "Theo hệ thống" };
