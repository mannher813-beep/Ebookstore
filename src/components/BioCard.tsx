import React from "react";
import { Bio } from "../types";
import { FileText, Eye, Edit3, Trash2, Globe, Lock } from "lucide-react";

interface BioCardProps {
  key?: any;
  bio: Bio;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
}

export default function BioCard({
  bio,
  onEdit,
  onView,
  onDelete,
}: BioCardProps) {
  const { slug, content, is_public, updated_at, created_at } = bio;

  const dateString = new Date(updated_at || created_at || "").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Strip simple markdown for text preview
  const plainText = content
    ? content
        .replace(/[#*`_~]/g, "") // remove formatting characters
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // format links as pure text
        .substring(0, 140) + "..."
    : "Aucun contenu rédigé pour le moment.";

  return (
    <div className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-lg rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between h-full group font-sans">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl transition-colors duration-300">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            {is_public ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Globe className="h-3 w-3" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="h-3 w-3" />
                Privé
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
            Lien: /bio/{slug}
          </span>
          <h3 className="text-base font-black text-slate-900 mt-1 line-clamp-1 group-hover:text-indigo-650 transition-colors">
            Biographie de {slug}
          </h3>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed mt-2 line-clamp-3">
            {plainText}
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 font-mono">Màj: {dateString}</span>

        <div className="flex items-center gap-1.5">
          {is_public && (
            <button
              onClick={onView}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
              title="Voir la page publique"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
            title="Modifier la biographie"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
