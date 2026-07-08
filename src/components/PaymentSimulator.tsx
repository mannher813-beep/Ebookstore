import React, { useState } from "react";
import { CreditCard, Phone, CheckCircle, ArrowRight, XCircle, AlertCircle, Sparkles, Smartphone } from "lucide-react";

interface PaymentSimulatorProps {
  token: string;
  price: number;
  ebookTitle: string;
  clientName: string;
  onPaymentProcessed: () => void;
}

export default function PaymentSimulator({
  token,
  price,
  ebookTitle,
  clientName,
  onPaymentProcessed,
}: PaymentSimulatorProps) {
  const [operator, setOperator] = useState<"orange" | "mtn" | "wave" | "moov">("orange");
  const [phoneNumber, setPhoneNumber] = useState("01010101");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const triggerWebhookSim = async (status: "completed" | "cancelled") => {
    setLoading(true);
    setError(null);

    // Mock direct payload simulating MoneyFusion webhook
    const webhookPayload = {
      event: status === "completed" ? "payin.session.completed" : "payin.session.cancelled",
      tokenPay: token,
      numeroSend: phoneNumber,
      nomclient: clientName,
      numeroTransaction: "TX-" + Math.floor(Math.random() * 10000000),
      Montant: price,
      frais: Math.round(price * 0.02),
      personal_Info: [{ userId: "mock-user", orderId: "order_123", ebookId: "mock-ebook" }],
      createdAt: new Date().toISOString(),
    };

    try {
      console.log(`Sending simulated webhook notification: /api/webhook/moneyfusion`, webhookPayload);
      const res = await fetch("/api/webhook/moneyfusion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (res.ok) {
        if (status === "completed") {
          setSuccess(true);
          setTimeout(() => {
            onPaymentProcessed();
          }, 2000);
        } else {
          setError("Le paiement a été simulé comme annulé.");
          setTimeout(() => {
            onPaymentProcessed();
          }, 2000);
        }
      } else {
        throw new Error("L'API Webhook de votre serveur a retourné une erreur.");
      }
    } catch (err: any) {
      setError(err.message || "Impossible d'atteindre le endpoint webhook de votre serveur Express.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 font-sans" id="payment-simulator">
      {/* Phone Screen Notch */}
      <div className="bg-slate-950 py-2.5 flex justify-center items-center">
        <div className="h-4 w-28 bg-slate-900 rounded-full border border-slate-800/40"></div>
      </div>

      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-indigo-400 animate-pulse" />
          <h3 className="font-display font-extrabold text-xs tracking-wider text-slate-200">
            GUICHET DE PAIEMENT SIMULÉ
          </h3>
        </div>
        <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded font-mono border border-indigo-500/20">
          MONEYFUSION SIMULATOR
        </span>
      </div>

      {/* Main Body */}
      <div className="p-6 space-y-6">
        {/* Ticket Details */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/60 space-y-3.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-500 font-medium">Marchand</span>
            <span className="font-bold text-slate-200">EbookStore Africa</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-500 font-medium">Article</span>
            <span className="font-bold text-slate-200 truncate max-w-[200px]" title={ebookTitle}>
              {ebookTitle}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-500 font-medium">Client</span>
            <span className="font-bold text-slate-200">{clientName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-slate-500 font-medium">Référence</span>
            <span className="font-mono text-slate-400 text-[11px] truncate max-w-[150px]">{token}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400 font-bold">MONTANT TOTAL</span>
            <span className="font-display font-black text-lg text-indigo-400">
              {price.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        {/* Dynamic State Alerts */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-900 p-3 rounded-xl flex items-start gap-2.5 text-xs text-rose-400">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="bg-emerald-950/60 border border-emerald-900 p-5 rounded-2xl text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-emerald-400">Paiement Validé !</h4>
            <p className="text-xs text-emerald-500 leading-relaxed">
              La simulation a envoyé avec succès un événement <strong>completed</strong> au webhook de votre serveur. Redirection en cours...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Operator Selection */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Choisissez votre opérateur mobile
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "orange", label: "Orange", color: "hover:border-orange-500 active:bg-orange-500/10", activeColor: "border-orange-500 bg-orange-500/10 text-orange-400" },
                  { id: "mtn", label: "MTN", color: "hover:border-yellow-500 active:bg-yellow-500/10", activeColor: "border-yellow-500 bg-yellow-500/10 text-yellow-400" },
                  { id: "moov", label: "Moov", color: "hover:border-blue-500 active:bg-blue-500/10", activeColor: "border-blue-500 bg-blue-500/10 text-blue-400" },
                  { id: "wave", label: "Wave", color: "hover:border-sky-400 active:bg-sky-400/10", activeColor: "border-sky-400 bg-sky-400/10 text-sky-400" },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setOperator(op.id as any)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      operator === op.id ? op.activeColor : `border-slate-800 bg-slate-950 text-slate-500 ${op.color}`
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Numéro de téléphone payeur
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all text-sm font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={() => triggerWebhookSim("completed")}
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:shadow-indigo-600/15"
              >
                <CheckCircle className="h-4.5 w-4.5" />
                <span>{loading ? "Vérification..." : "Confirmer le Paiement (Simuler Succès)"}</span>
              </button>

              <button
                type="button"
                onClick={() => triggerWebhookSim("cancelled")}
                disabled={loading}
                className="w-full py-2 bg-transparent hover:bg-rose-950/30 text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800"
              >
                <XCircle className="h-4 w-4" />
                <span>Simuler une Annulation / Échec</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simulator footer explanations */}
      <div className="bg-slate-950 p-5 border-t border-slate-800 text-[11px] text-slate-500 space-y-2 leading-relaxed">
        <p className="flex gap-1.5 items-start">
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            <strong>Pourquoi ce guichet ?</strong> Votre serveur n'a pas encore configuré l'API de production MoneyFusion. Cet écran interactif vous permet de valider le comportement complet du webhook en temps réel, garantissant le déblocage et l'enregistrement de l'ebook.
          </span>
        </p>
      </div>
    </div>
  );
}
