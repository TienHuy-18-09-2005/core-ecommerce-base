import type { CategoryNode } from "../../../types/catalog.ts";

interface Props {
  categories: CategoryNode[];
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}

function Branch({ nodes, selectedId, onSelect, depth }: Props & { nodes: CategoryNode[]; depth: number }) {
  return (
    <ul className={depth > 0 ? "ml-3 border-l border-slate-200 pl-2" : undefined}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            aria-pressed={selectedId === node.id}
            onClick={() => onSelect(selectedId === node.id ? undefined : node.id)}
            className={`w-full rounded px-2 py-1 text-left text-sm ${
              selectedId === node.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {node.name}
          </button>
          {node.children && node.children.length > 0 ? (
            <Branch categories={[]} nodes={node.children} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Cây danh mục theo parent_id (task 2.3). Bấm lại mục đang chọn để bỏ lọc. */
export function CategorySidebar({ categories, selectedId, onSelect }: Props) {
  if (categories.length === 0) return <p className="text-sm text-slate-500">Chưa có danh mục.</p>;
  return <Branch categories={categories} nodes={categories} selectedId={selectedId} onSelect={onSelect} depth={0} />;
}
