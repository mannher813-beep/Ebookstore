import React from "react";
import { X, CreditCard, ArrowRight, Download, Calendar, ShieldCheck, CheckCircle2, FileText, Globe } from "lucide-react";
import { Ebook } from "../types";

interface BookDetailModalProps {
  ebook: Ebook | null;
  onClose: () => void;
  onBuy: (ebook: Ebook) => void;
  hasPurchased: boolean;
  isPurchasing: boolean;
  user: any;
  onOpenAuth: () => void;
  onDownload: (ebookId: string) => void;
  downloadingId: string | null;
}

export default function BookDetailModal({
  ebook,
  onClose,
  onBuy,
  hasPurchased,
  isPurchasing,
  user,
  onOpenAuth,
  onDownload,
  downloadingId,
}: BookDetailModalProps) {
  if (!ebook) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="book-detail-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0 font-sans">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl flex flex-col md:flex-row border border-slate-200">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Left Column: Cover */}
          <div className="w-full md:w-2/5 bg-slate-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
            <div className="w-40 md:w-full max-w-[180px] aspect-[2/3] bg-white rounded-xl shadow-lg border border-slate-200/50 overflow-hidden relative group">
              <img
                src={ebook.url_couverture}
                alt={ebook.titre}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 right-2 bg-slate-900 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono">
                PDF
              </span>
            </div>

            <div className="mt-5 w-full text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">ID unique</span>
              <span className="text-[11px] font-mono text-slate-500 block truncate max-w-full px-2">
                {ebook.id}
              </span>
            </div>
          </div>

          {/* Right Column: Book details */}
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
            <div>
              {/* Category */}
              <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md border border-indigo-100 font-mono mb-3">
                {ebook.categorie}
              </span>

              <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight leading-snug">
                {ebook.titre}
              </h2>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-3 my-4 py-3 border-y border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span>Format : <strong>Ebook PDF</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span>Langue : <strong>Français</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Mise à jour : <strong>2026</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>Téléchargement : <strong>Sécurisé</strong></span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Résumé de l'ouvrage</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-h-44 overflow-y-auto pr-1">
                  {ebook.description}
                </p>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Tarif de l'oeuvre</span>
                  <span className="font-display font-black text-xl sm:text-2xl text-slate-900">
                    {ebook.prix.toLocaleString()} <span className="text-sm text-indigo-500 font-bold font-mono">FCFA</span>
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Transaction SSL 256-bit
                </span>
              </div>

              {hasPurchased ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Vous avez acheté ce livre. Téléchargez votre copie ci-dessous :</span>
                  </div>
                  <button
                    onClick={() => onDownload(ebook.id)}
                    disabled={downloadingId === ebook.id}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Download className="h-4.5 w-4.5" />
                    <span>{downloadingId === ebook.id ? "Préparation du lien signé..." : "Télécharger mon Ebook (PDF)"}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!user) {
                      onOpenAuth();
                    } else {
                      onBuy(ebook);
                    }
                  }}
                  disabled={isPurchasing}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                >
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>
                    {isPurchasing
                      ? "Initialisation de la transaction..."
                      : `Acheter via Mobile Money (${ebook.prix.toLocaleString()} FCFA)`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
