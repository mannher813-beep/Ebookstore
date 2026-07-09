import React from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface DynamicListProps<T> {
  items: T[];
  onChange: (items: T[]) => void;
  renderItemForm: (
    item: T,
    index: number,
    updateItem: (fields: Partial<T>) => void
  ) => React.ReactNode;
  newItemTemplate: T;
  addButtonLabel?: string;
  emptyMessage?: string;
  title?: string;
  id?: string;
}

export default function DynamicList<T>({
  items,
  onChange,
  renderItemForm,
  newItemTemplate,
  addButtonLabel = "Ajouter un élément",
  emptyMessage = "Aucun élément ajouté pour le moment.",
  title,
  id = "dynamic-list",
}: DynamicListProps<T>) {
  const addItem = () => {
    onChange([...items, { ...newItemTemplate }]);
  };

  const removeItem = (indexToRemove: number) => {
    onChange(items.filter((_, i) => i !== indexToRemove));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === items.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChange(updated);
  };

  const updateItem = (index: number, fields: Partial<T>) => {
    const updated = items.map((item, i) => {
      if (i === index) {
        return { ...item, ...fields };
      }
      return item;
    });
    onChange(updated);
  };

  return (
    <div className="w-full font-sans space-y-4" id={id}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-sm font-bold text-slate-800">{title}</h4>
          <span className="text-xs text-slate-400 font-mono font-bold">
            {items.length} au total
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
          <p className="text-sm text-slate-500 font-medium mb-3">{emptyMessage}</p>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-indigo-600 text-xs font-bold border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{addButtonLabel}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="relative p-5 bg-white border border-slate-200 rounded-2xl shadow-xs hover:shadow-md hover:border-slate-300 transition-all group/card"
            >
              {/* Floating controls */}
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-50 border border-slate-200/50 p-1 rounded-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(index, "up")}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-150 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
                  title="Déplacer vers le haut"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, "down")}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-150 disabled:opacity-30 rounded-lg cursor-pointer transition-colors"
                  title="Déplacer vers le bas"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Render item form */}
              <div className="pr-20 md:pr-0">
                {renderItemForm(item, index, (fields) =>
                  updateItem(index, fields)
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="w-full py-3 bg-slate-50 hover:bg-slate-100/80 text-indigo-600 text-sm font-bold border border-dashed border-slate-200 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>{addButtonLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
