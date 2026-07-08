import React, { useState } from "react";
import { Download, RefreshCw, BookMarked, HelpCircle, CheckCircle, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { Achat, PaymentStatus } from "../types";

interface PurchaseListProps {
  purchases: Achat[];
  onDownload: (ebookId: string) => void;
  downloadingId: string | null;
  onRefreshStatus: (token: string) => Promise<void>;
  setView: (view: string) => void;
}

export default function PurchaseList({
  purchases,
  onDownload,
  downloadingId,
  onRefreshStatus,
  setView,
}: PurchaseListProps) {
  const [refreshingToken, setRefreshingToken] = useState<string | null>(null);

  const handleRefresh = async (token: string) => {
    setRefreshingToken(token);
    await onRefreshStatus(token);
    setRefreshingToken(null);
  };

  return (
    <div className="space-y-8 font-sans" id="purchase-list">
      {/* Page Title */}
      <div>
        <h2 className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight flex items-center gap-2.5">
          <BookMarked className="h-7 w-7 text-indigo-600" /> Mes Achats & Téléchargements
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
          Retrouvez ici tous les ebooks que vous avez achetés. Vos liens de téléchargement sont signés de manière unique et expirent rapidement pour garantir la sécurité des oeuvres.
        </p>
      </div>

      {purchases.length === 0 ? (
        /* Empty State Card */
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-6">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <BookMarked className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display font-bold text-lg text-slate-900">Aucun livre acheté pour le moment</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Parcourez notre catalogue d'ebooks sur la programmation, le design, le marketing et le business en Afrique, et achetez votre première oeuvre par mobile money !
            </p>
          </div>
          <button
            onClick={() => setView("catalog")}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow cursor-pointer hover:shadow-md"
          >
            Découvrir le Catalogue
          </button>
        </div>
      ) : (
        /* Purchase Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {purchases.map((purchase) => {
            const ebook = purchase.ebook;
            if (!ebook) return null; // Defensive check if ebook was deleted

            const isPaid = purchase.statut === PaymentStatus.PAID;
            const isPending = purchase.statut === PaymentStatus.PENDING;
            const isFailed = purchase.statut === PaymentStatus.FAILURE || purchase.statut === PaymentStatus.NO_PAID;

            return (
              <div
                key={purchase.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex gap-4 hover:border-indigo-300 transition-all"
              >
                {/* Book Cover */}
                <div className="w-20 sm:w-24 aspect-[2/3] bg-slate-50 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm">
                  <img
                    src={ebook.url_couverture}
                    alt={ebook.titre}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Purchase Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                      {ebook.categorie}
                    </span>
                    <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 mt-1 truncate">
                      {ebook.titre}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-1">
                      Réf: {purchase.token_pay.substring(0, 15)}...
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                    {/* Status badges */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Statut :</span>
                      {isPaid ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono">
                          <CheckCircle className="h-3 w-3" /> PAYÉ
                        </span>
                      ) : isPending ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono animate-pulse">
                          <Clock className="h-3 w-3" /> PENDANT (MOBILE MONEY)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 font-mono">
                          <AlertTriangle className="h-3 w-3" /> ÉCHOUÉ / ANNULÉ
                        </span>
                      )}
                    </div>

                    {/* Action Triggers */}
                    {isPaid ? (
                      <button
                        onClick={() => onDownload(ebook.id)}
                        disabled={downloadingId === ebook.id}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{downloadingId === ebook.id ? "Signature..." : "Télécharger mon PDF"}</span>
                      </button>
                    ) : isPending ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRefresh(purchase.token_pay)}
                          disabled={refreshingToken === purchase.token_pay}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 text-white disabled:text-slate-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${refreshingToken === purchase.token_pay ? "animate-spin" : ""}`} />
                          <span>{refreshingToken === purchase.token_pay ? "Sync..." : "Vérifier Statut"}</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setView("catalog")}
                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center cursor-pointer border border-slate-200"
                      >
                        Recommencer l'achat
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
