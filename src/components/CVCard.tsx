import React from "react";
import { CV } from "../types";
import { FileText, Eye, Edit3, Download, Trash2, Globe, Lock, UserCheck } from "lucide-react";

interface CVCardProps {
  key?: any;
  cv: CV;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export default function CVCard({
  cv,
  onEdit,
  onView,
  onDelete,
  onDownload,
  isDownloading = false,
}: CVCardProps) {
  const { reference, data, is_public, visibility, updated_at, created_at } = cv;
  const { nom, titre, competences } = data;

  const dateString = new Date(updated_at || created_at || "").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const getVisibilityBadge = () => {
    switch (visibility) {
      case "public":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Globe className="h-3 w-3" />
            Public
          </span>
        );
      case "anonymous":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <UserCheck className="h-3 w-3" />
            Anonyme
          </span>
        );
      case "private":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Lock className="h-3 w-3" />
            Privé
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-lg rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between h-full group font-sans">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-xl transition-colors duration-300">
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-1.5">{getVisibilityBadge()}</div>
        </div>

        {/* Content */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
            REF: {reference}
          </span>
          <h3 className="text-base font-black text-slate-900 mt-1 line-clamp-1 group-hover:text-indigo-650 transition-colors">
            {nom || "CV sans nom"}
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-0.5 line-clamp-1">{titre || "Titre non défini"}</p>

          {competences && competences.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-3">
              {competences.slice(0, 3).map((comp, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-semibold rounded"
                >
                  {comp}
                </span>
              ))}
              {competences.length > 3 && (
                <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[10px] font-mono">
                  +{competences.length - 3}
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic mt-3">Aucune compétence ajoutée</p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-400 font-mono">Màj: {dateString}</span>

        <div className="flex items-center gap-1.5">
          {visibility !== "private" && (
            <button
              onClick={onView}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
              title="Voir la page publique"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer transition-all disabled:opacity-50"
            title="Télécharger le PDF"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-all"
            title="Modifier le CV"
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
