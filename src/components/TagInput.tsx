import React, { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  id?: string;
}

export default function TagInput({
  tags,
  onChange,
  placeholder = "Ajouter une compétence...",
  maxTags = 15,
  id = "tag-input",
}: TagInputProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = input.trim().replace(/,$/, "");
    if (!trimmed) return;

    if (tags.length >= maxTags) {
      setInput("");
      return;
    }

    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="w-full font-sans" id={id}>
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all min-h-[46px] items-center">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-100/50 hover:bg-indigo-100/50 transition-colors"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="p-0.5 hover:bg-indigo-200 text-indigo-500 hover:text-indigo-800 rounded-md transition-colors cursor-pointer"
              aria-label={`Supprimer ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {tags.length < maxTags && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none py-1 px-1"
          />
        )}
      </div>
      <div className="flex justify-between items-center mt-1.5 px-1">
        <p className="text-[10px] text-slate-400 font-medium">
          Appuyez sur <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono">Entrée</kbd> ou <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono">,</kbd> pour valider.
        </p>
        <p className="text-[10px] text-slate-400 font-semibold font-mono">
          {tags.length}/{maxTags}
        </p>
      </div>
    </div>
  );
}
