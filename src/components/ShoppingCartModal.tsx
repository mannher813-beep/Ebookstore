import React, { useState } from "react";
import { X, Trash2, CreditCard, ShieldCheck, ShoppingCart, ArrowRight, Download, Info } from "lucide-react";
import { Ebook } from "../types";

interface ShoppingCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Ebook[];
  onRemoveFromCart: (ebook: Ebook) => void;
  onClearCart: () => void;
  user: any;
  onOpenAuth: () => void;
  onPayCart: (numeroSend: string, nomclient: string) => Promise<void>;
  isProcessing: boolean;
}

export default function ShoppingCartModal({
  isOpen,
  onClose,
  cart,
  onRemoveFromCart,
  onClearCart,
  user,
  onOpenAuth,
  onPayCart,
  isProcessing,
}: ShoppingCartModalProps) {
  const [numeroSend, setNumeroSend] = useState("");
  const [nomclient, setNomclient] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const paidEbooks = cart.filter((item) => item.prix > 0);
  const totalPrice = paidEbooks.reduce((sum, item) => sum + Number(item.prix), 0);
  const isFreeOnly = cart.length > 0 && totalPrice === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      onOpenAuth();
      onClose();
      return;
    }

    if (cart.length === 0) {
      setError("Votre panier est vide.");
      return;
    }

    // Phone number and client name validation only needed for paid checkouts
    if (!isFreeOnly) {
      if (!numeroSend.trim()) {
        setError("Veuillez saisir votre numéro de paiement (Mobile Money/Orange Money).");
        return;
      }
      if (!nomclient.trim()) {
        setError("Veuillez saisir votre nom complet.");
        return;
      }
    }

    try {
      await onPayCart(numeroSend, nomclient);
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'initialisation du paiement.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans animate-fade-in" id="cart-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      {/* Modal Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-slate-200 flex flex-col p-6 sm:p-8 space-y-6">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                Votre Panier d'Ebooks
              </h3>
              <p className="text-xs text-slate-500">
                {cart.length === 0
                  ? "Votre panier est actuellement vide"
                  : `${cart.length} ebook${cart.length > 1 ? "s" : ""} sélectionné${cart.length > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Cart Content */}
          {cart.length === 0 ? (
            <div className="py-8 text-center space-y-4">
              <div className="h-16 w-16 bg-slate-50 text-slate-350 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                <ShoppingCart className="h-8 w-8" />
              </div>
              <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                Parcourez notre catalogue pour y ajouter les meilleurs ebooks et les acheter en un seul paiement groupé.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Parcourir le catalogue
              </button>
            </div>
          ) : (
            <>
              {/* Error Alert */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-shake">
                  <span className="font-extrabold">Attention :</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Items List */}
              <div className="max-h-56 overflow-y-auto pr-1 space-y-2 border-y border-slate-100 py-3 scrollbar-thin">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-12 w-9 rounded-md bg-white border border-slate-200 shadow-xs overflow-hidden shrink-0">
                        <img
                          src={item.url_couverture || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=400"}
                          alt={item.titre}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.titre}</h4>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{item.categorie}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {item.prix === 0 ? (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">GRATUIT</span>
                        ) : (
                          <span className="text-xs font-bold text-indigo-650 font-mono">
                            {item.prix.toLocaleString()} <span className="text-[9px]">FCFA</span>
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveFromCart(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Retirer du panier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Calculation */}
              <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono block">
                    Total du panier
                  </span>
                  <span className="text-xs text-indigo-500 font-mono">
                    {cart.length} ebook{cart.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="text-right">
                  {isFreeOnly ? (
                    <span className="font-display font-black text-xl text-emerald-600 uppercase tracking-wider font-mono">
                      GRATUIT
                    </span>
                  ) : (
                    <span className="font-display font-black text-2xl text-indigo-600">
                      {totalPrice.toLocaleString()} <span className="text-sm font-bold font-mono">FCFA</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Checkout Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!user ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Veuillez vous authentifier pour valider et télécharger les ebooks de votre panier.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAuth();
                        onClose();
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      S'authentifier avec Google
                    </button>
                  </div>
                ) : (
                  <>
                    {!isFreeOnly && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mb-1">
                          <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span>Paiement Mobile Money</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block">
                              Numéro Mobile Money *
                            </label>
                            <input
                              type="tel"
                              required
                              value={numeroSend}
                              onChange={(e) => setNumeroSend(e.target.value)}
                              placeholder="Ex: 655443322 (Orange, MTN...)"
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 font-mono uppercase block">
                              Votre nom complet *
                            </label>
                            <input
                              type="text"
                              required
                              value={nomclient}
                              onChange={(e) => setNomclient(e.target.value)}
                              placeholder="Ex: Jean Dupont"
                              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`w-full py-3 text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs sm:text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95 ${
                        isFreeOnly
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {isFreeOnly ? (
                        <Download className="h-4.5 w-4.5" />
                      ) : (
                        <CreditCard className="h-4.5 w-4.5" />
                      )}
                      <span>
                        {isProcessing
                          ? "Traitement en cours..."
                          : isFreeOnly
                          ? "Ajouter les ebooks gratuits à mon espace"
                          : `Payer le panier via Mobile Money (${totalPrice.toLocaleString()} FCFA)`}
                      </span>
                    </button>
                  </>
                )}
              </form>

              {/* Secure Footer */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>Paiements groupés sécurisés via MoneyFusion SSL</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
