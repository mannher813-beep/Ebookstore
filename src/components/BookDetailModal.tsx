import React, { useState } from "react";
import { X, CreditCard, ArrowRight, Download, Calendar, ShieldCheck, CheckCircle2, FileText, Globe, Share2, Check, ShoppingCart } from "lucide-react";
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
  onAddToCart?: (ebook: Ebook) => void;
  onRemoveFromCart?: (ebook: Ebook) => void;
  isInCart?: boolean;
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
  onAddToCart,
  onRemoveFromCart,
  isInCart = false,
}: BookDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!ebook) return null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `https://ebookstore-73b.pages.dev/ebook/${ebook.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: ebook.titre,
          text: ebook.description || `Découvrez l'ebook "${ebook.titre}" sur EbookStore !`,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

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

          {/* Share Button (Top right, next to close) */}
          <button
            onClick={handleShare}
            className="absolute right-14 top-4 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer flex items-center justify-center"
            title="Partager cet ebook"
          >
            {copied ? (
              <span className="flex items-center gap-1 px-1 text-[10px] text-emerald-600 font-bold font-mono">
                <Check className="h-3 w-3" /> Copié
              </span>
            ) : (
              <Share2 className="h-4 w-4" />
            )}
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
          <div className="p-6 md:p-8 flex-1 flex flex-col justify-between pb-24 md:pb-8">
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
                  {ebook.prix === 0 ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider font-mono mt-1">
                      GRATUIT
                    </span>
                  ) : (
                    <span className="font-display font-black text-xl sm:text-2xl text-slate-900">
                      {ebook.prix.toLocaleString()} <span className="text-sm text-indigo-500 font-bold font-mono">FCFA</span>
                    </span>
                  )}
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDownload(ebook.id)}
                      disabled={downloadingId === ebook.id}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
                    >
                      <Download className="h-4.5 w-4.5" />
                      <span>{downloadingId === ebook.id ? "Préparation du lien signé..." : "Télécharger mon Ebook (PDF)"}</span>
                    </button>

                    <button
                      onClick={handleShare}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 border border-slate-200"
                      title="Partager"
                    >
                      {copied ? (
                        <span className="text-xs font-bold text-emerald-600 px-1 font-mono">Copié !</span>
                      ) : (
                        <Share2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!user) {
                        onOpenAuth();
                      } else {
                        onBuy(ebook);
                      }
                    }}
                    disabled={isPurchasing}
                    className={`flex-[1.5] py-3 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95 ${
                      ebook.prix === 0 
                        ? "bg-emerald-600 hover:bg-emerald-700" 
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {ebook.prix === 0 ? (
                      <Download className="h-4.5 w-4.5" />
                    ) : (
                      <CreditCard className="h-4.5 w-4.5" />
                    )}
                    <span>
                      {isPurchasing
                        ? "Initialisation..."
                        : ebook.prix === 0
                        ? "Prendre gratuitement"
                        : "Acheter maintenant"}
                    </span>
                  </button>

                  {onAddToCart && onRemoveFromCart && (
                    <button
                      onClick={() => {
                        if (isInCart) {
                          onRemoveFromCart(ebook);
                        } else {
                          onAddToCart(ebook);
                        }
                      }}
                      className={`flex-1 py-3 border text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg active:scale-95 ${
                        isInCart
                          ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          : "bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100"
                      }`}
                    >
                      <ShoppingCart className="h-4.5 w-4.5" />
                      <span>{isInCart ? "Retirer" : "Panier"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleShare}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 border border-slate-200"
                    title="Partager"
                  >
                    {copied ? (
                      <span className="text-xs font-bold text-emerald-600 px-1 font-mono">Copié !</span>
                    ) : (
                      <Share2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Sticky CTA */}
      {!hasPurchased && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 z-40 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300 font-sans">
          <div className="text-left shrink-0">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Tarif unique</span>
            {ebook.prix === 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider font-mono mt-1">
                GRATUIT
              </span>
            ) : (
              <span className="font-display font-black text-lg text-slate-950">
                {ebook.prix.toLocaleString()} <span className="text-xs text-indigo-500 font-bold font-mono">FCFA</span>
              </span>
            )}
          </div>

          <div className="flex-1 flex gap-2">
            {onAddToCart && onRemoveFromCart && (
              <button
                onClick={() => {
                  if (isInCart) {
                    onRemoveFromCart(ebook);
                  } else {
                    onAddToCart(ebook);
                  }
                }}
                className={`px-3 py-3 border rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  isInCart
                    ? "bg-amber-50 border-amber-200 text-amber-750"
                    : "bg-indigo-50 border-indigo-150 text-indigo-750"
                }`}
                title={isInCart ? "Retirer" : "Ajouter au panier"}
              >
                <ShoppingCart className="h-4.5 w-4.5" />
              </button>
            )}

            <button
              onClick={() => {
                if (!user) {
                  onOpenAuth();
                } else {
                  onBuy(ebook);
                }
              }}
              disabled={isPurchasing}
              className={`flex-1 py-3 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95 duration-200 ${
                ebook.prix === 0 
                  ? "bg-emerald-600 hover:bg-emerald-700" 
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {ebook.prix === 0 ? (
                <Download className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              <span>{isPurchasing ? "Traitement..." : ebook.prix === 0 ? "Prendre" : "Acheter"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
