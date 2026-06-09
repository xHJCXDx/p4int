import { useMemo, useState, useCallback } from 'react';
import { Categoria } from '../types/categoria';

interface CategoriaTableProps {
  data: Categoria[];
  onEdit: (categoria: Categoria) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

interface TreeNode extends Categoria {
  depth: number;
  isLast: boolean;
  hasChildren: boolean;
  childCount: number;
}

function buildTree(categorias: Categoria[]): TreeNode[] {
  const byParent = new Map<number | null, Categoria[]>();
  for (const cat of categorias) {
    const key = cat.parent_id ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(cat);
  }

  const result: TreeNode[] = [];

  function countDescendants(parentId: number): number {
    const children = byParent.get(parentId) || [];
    let count = children.length;
    for (const child of children) {
      count += countDescendants(child.id!);
    }
    return count;
  }

  function walk(parentId: number | null, depth: number) {
    const children = byParent.get(parentId) || [];
    children.forEach((cat, idx) => {
      const directChildren = byParent.get(cat.id!) || [];
      result.push({
        ...cat,
        depth,
        isLast: idx === children.length - 1,
        hasChildren: directChildren.length > 0,
        childCount: countDescendants(cat.id!),
      });
      walk(cat.id!, depth + 1);
    });
  }

  walk(null, 0);
  return result;
}

function getAncestors(nodeId: number, tree: TreeNode[]): Set<number> {
  const ancestors = new Set<number>();
  let current = tree.find((n) => n.id === nodeId);
  while (current && current.parent_id) {
    ancestors.add(current.parent_id);
    current = tree.find((n) => n.id === current!.parent_id);
  }
  return ancestors;
}

export function CategoriaTable({ data, onEdit, onDelete, isLoading = false }: CategoriaTableProps) {
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const tree = useMemo(() => buildTree(data), [data]);

  const toggleCollapse = useCallback((id: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    if (filter) {
      const lower = filter.toLowerCase();
      return tree.filter(
        (node) =>
          node.nombre.toLowerCase().includes(lower) ||
          (node.descripcion && node.descripcion.toLowerCase().includes(lower)) ||
          (node.parent_nombre && node.parent_nombre.toLowerCase().includes(lower))
      );
    }

    return tree.filter((node) => {
      const ancestors = getAncestors(node.id!, tree);
      for (const ancestorId of ancestors) {
        if (collapsed.has(ancestorId)) return false;
      }
      return true;
    });
  }, [tree, filter, collapsed]);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left font-bold w-12">ID</th>
              <th className="px-4 py-3 text-left font-bold">Nombre</th>
              <th className="px-4 py-3 text-left font-bold">Descripcion</th>
              <th className="px-4 py-3 text-left font-bold w-40">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-600">
                  Cargando...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-600">
                  No hay categorias disponibles
                </td>
              </tr>
            ) : (
              visible.map((node) => {
                const isCollapsed = collapsed.has(node.id!);

                return (
                  <tr
                    key={node.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 ${
                      node.depth === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-500 text-sm">{node.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center" style={{ paddingLeft: `${node.depth * 28}px` }}>
                        {node.depth > 0 && (
                          <span className="text-gray-400 mr-2 flex-shrink-0">
                            {node.isLast ? '└─' : '├─'}
                          </span>
                        )}
                        {node.hasChildren && !filter && (
                          <button
                            onClick={() => toggleCollapse(node.id!)}
                            className="mr-2 w-5 h-5 flex items-center justify-center rounded bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold transition-colors flex-shrink-0"
                            title={isCollapsed ? 'Expandir' : 'Comprimir'}
                          >
                            {isCollapsed ? '+' : '−'}
                          </button>
                        )}
                        <div>
                          <span className={`font-medium ${node.depth === 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {node.nombre}
                          </span>
                          {node.hasChildren && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-600">
                              {isCollapsed ? `${node.childCount} ocultas` : 'padre'}
                            </span>
                          )}
                          {node.depth > 0 && node.parent_nombre && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-white">
                              hijo de {node.parent_nombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{node.descripcion || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(node)}
                          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded text-sm transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(node.id!)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-sm transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {visible.length} de {data.length} categorias
      </div>
    </div>
  );
}
