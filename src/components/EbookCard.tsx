import React, { useState } from "react";
import { CreditCard, ArrowRight, CheckCircle, Eye, Star, Share2, Check, Download } from "lucide-react";
import { Ebook } from "../types";

interface EbookCardProps {
  key?: any;
  ebook: Ebook;
  onSelect: (ebook: Ebook) => void;
  onBuy: (ebook: Ebook) => void;
  hasPurchased: boolean;
  isPurchasing: boolean;
  user: any;
  onOpenAuth: () => void;
}

export default function EbookCard({
  ebook,
  onSelect,
  onBuy,
  hasPurchased,
  isPurchasing,
  user,
  onOpenAuth,
}: EbookCardProps) {
  // Simple random static rating generator for visual elegance
  const rating = 4.8;
  const reviewsCount = 14;
  const [copied, setCopied] = useState(false);

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
    <div
      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300 flex flex-col group h-full"
      id={`ebook-card-${ebook.id}`}
    >
      {/* Cover Image Area */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden shrink-0">
        <img
          src={ebook.url_couverture || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"}
          alt={ebook.titre}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400";
          }}
        />
        {/* Category Badge */}
        <span className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm font-mono">
          {ebook.categorie}
        </span>

        {/* Action Overlays */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={() => onSelect(ebook)}
            className="p-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-full transition-all hover:scale-110 shadow-lg cursor-pointer"
            title="Aperçu rapide"
          >
            <Eye className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Book Information */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title and Rating */}
          <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1.5 font-medium">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-slate-400 font-mono text-[10px]">({reviewsCount} ventes)</span>
          </div>

          <h3 className="font-display font-bold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {ebook.titre}
          </h3>

          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {ebook.description}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">Prix</span>
              {ebook.prix === 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider font-mono mt-1">
                  GRATUIT
                </span>
              ) : (
                <span className="font-display font-black text-lg text-indigo-600">
                  {ebook.prix.toLocaleString()} <span className="text-xs text-indigo-400 font-bold font-mono">FCFA</span>
                </span>
              )}
            </div>

            {hasPurchased && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 font-mono">
                <CheckCircle className="h-3.5 w-3.5" /> ACQUIS
              </span>
            )}
          </div>

          {/* Checkout CTAs */}
          {hasPurchased ? (
            <div className="flex gap-2">
              <button
                onClick={() => onSelect(ebook)}
                className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-200"
              >
                <span>Accéder au Téléchargement</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleShare}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-950 border border-slate-200 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Partager"
              >
                {copied ? (
                  <span className="text-[10px] font-bold text-emerald-600 px-1 font-mono">Copié !</span>
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onSelect(ebook)}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-200"
              >
                <span>Détails</span>
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    onOpenAuth();
                  } else {
                    onBuy(ebook);
                  }
                }}
                disabled={isPurchasing}
                className={`flex-[1.5] py-2 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow active:scale-95 ${
                  ebook.prix === 0 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {ebook.prix === 0 ? (
                  <Download className="h-3.5 w-3.5" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                <span>{isPurchasing ? "Traitement..." : ebook.prix === 0 ? "Télécharger" : "Acheter"}</span>
              </button>

              <button
                onClick={handleShare}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-950 border border-slate-200 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Partager"
              >
                {copied ? (
                  <span className="text-[10px] font-bold text-emerald-600 px-1 font-mono">Copié !</span>
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
