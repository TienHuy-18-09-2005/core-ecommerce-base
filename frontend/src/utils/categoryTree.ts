import type { CategoryNode } from "../types/catalog.ts";

/** Đường dẫn từ gốc tới danh mục id (dùng cho breadcrumb + mở sidebar). */
export function findCategoryPath(nodes: CategoryNode[], id: number | undefined): CategoryNode[] {
  if (id === undefined) return [];
  for (const node of nodes) {
    if (node.id === id) return [node];
    const sub = findCategoryPath(node.children ?? [], id);
    if (sub.length > 0) return [node, ...sub];
  }
  return [];
}
