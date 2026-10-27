import { useState } from "react";
import { readTablePref, saveTablePref } from "../../../utils/adminPrefs.ts";

export type Density = "comfortable" | "compact";

/** Mật độ bảng dùng chung mọi bảng (lưu theo trình duyệt của người dùng). */
export function useDensity() {
  const [density, setDensity] = useState<Density>(() => (readTablePref<string>("density", "comfortable") === "compact" ? "compact" : "comfortable"));
  return [density, (d: Density) => { setDensity(d); saveTablePref("density", d); }] as const;
}

/** Cột bị ẩn theo từng bảng. */
export function useHiddenColumns(tableId: string | undefined) {
  const [hidden, setHidden] = useState<string[]>(() => (tableId ? readTablePref<string[]>(`${tableId}.hidden`, []) : []));
  const toggle = (col: string) => {
    setHidden((h) => {
      const next = h.includes(col) ? h.filter((c) => c !== col) : [...h, col];
      if (tableId) saveTablePref(`${tableId}.hidden`, next);
      return next;
    });
  };
  return { hidden, toggle };
}

export interface SavedView { name: string; query: string }

export function useSavedViews(tableId: string) {
  const [views, setViews] = useState<SavedView[]>(() => readTablePref<SavedView[]>(`${tableId}.views`, []));
  const persist = (next: SavedView[]) => { setViews(next); saveTablePref(`${tableId}.views`, next); };
  return {
    views,
    save: (v: SavedView) => persist([...views.filter((x) => x.name !== v.name), v]),
    remove: (name: string) => persist(views.filter((x) => x.name !== name)),
  };
}
