import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  supabase, 
  hasSupabaseKeys 
} from "../supabaseClient";
import { 
  Affiliate, 
  AffiliateCommission, 
  AffiliateMessage,
  Ebook,
  Achat
} from "../types";
import { 
  Coins, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Send, 
  MessageSquare, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  Phone,
  User,
  ExternalLink,
  RefreshCw,
  XCircle,
  AlertCircle
} from "lucide-react";

interface AffiliatePortalProps {
  user: { id: string; email: string } | null;
  userAffiliate: Affiliate | null;
  onRefreshAffiliate: (userId: string) => Promise<void>;
  onOpenAuth: () => void;
  ebooks: Ebook[];
  purchases: Achat[];
}

export default function AffiliatePortal({
  user,
  userAffiliate,
  onRefreshAffiliate,
  onOpenAuth,
  ebooks,
  purchases,
}: AffiliatePortalProps) {
  // Navigation / onboarding local view
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [nomComplet, setNomComplet] = useState("");
  const [telephone, setTelephone] = useState("");
  const [moyenPromotion, setMoyenPromotion] = useState("");
  const [lienAudience, setLienAudience] = useState("");

  // Stats states
  const [stats, setStats] = useState({
    clics: 0,
    conversions: 0,
    gainsClaimable: 0,
    gainsPendingClaim: 0,
    gainsPaid: 0,
    filleulsCount: 0,
    tauxConversion: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Payout states
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [loadingPayouts, setLoadingPayouts] = useState(false);
  const [payoutPhone, setPayoutPhone] = useState("");
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [copiedEbookId, setCopiedEbookId] = useState<string | null>(null);

  // Message states
  const [messages, setMessages] = useState<AffiliateMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  // Copy feedback states
  const [copiedLink, setCopiedLink] = useState<"ref" | "recruit" | null>(null);

  // If in resubmission mode
  const [isRetrying, setIsRetrying] = useState(false);

  // Pre-fill form if userAffiliate exists (for editing/resubmitting)
  useEffect(() => {
    if (userAffiliate) {
      setNomComplet(userAffiliate.nom_complet || "");
      setTelephone(userAffiliate.telephone || "");
      setMoyenPromotion(userAffiliate.moyen_promotion || "");
      setLienAudience(userAffiliate.lien_audience || "");
    }
  }, [userAffiliate]);

  // Fetch Dashboard Stats & Messages when approved & active
  useEffect(() => {
    if (userAffiliate && userAffiliate.status === "approved" && userAffiliate.activated) {
      fetchDashboardStats();
      fetchMessages();
      
      // Auto-poll messages every 10 seconds for real-time-like experience
      const interval = setInterval(() => {
        fetchMessages();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [userAffiliate]);

  // Scroll to bottom of chat thread
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const fetchPayoutRequests = async () => {
    if (!userAffiliate || !supabase) return;
    setLoadingPayouts(true);
    try {
      const { data, error } = await supabase
        .from("commission_payout_requests")
        .select("*")
        .eq("affiliate_id", userAffiliate.id)
        .order("requested_at", { ascending: false });

      if (!error && data) {
        setPayoutRequests(data);
      }
    } catch (err) {
      console.error("Error fetching payout requests:", err);
    } finally {
      setLoadingPayouts(false);
    }
  };

  const fetchDashboardStats = async () => {
    if (!userAffiliate || !supabase) return;
    setLoadingStats(true);
    try {
      // 1. Clics count
      const { count: clicsCount } = await supabase
        .from("affiliate_clicks")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", userAffiliate.id);

      // 2. Conversions (achats payés attribués à cet affilié)
      const { count: conversionsCount } = await supabase
        .from("achats")
        .select("*", { count: "exact", head: true })
        .eq("affiliate_id", userAffiliate.id)
        .eq("statut", "paid");

      // 3. Commissions (parrain ou direct)
      const { data: commissions } = await supabase
        .from("affiliate_commissions")
        .select("montant, statut, payout_request_id")
        .eq("affiliate_id", userAffiliate.id);

      let claimableSum = 0;
      let pendingClaimSum = 0;
      let paidSum = 0;
      if (commissions) {
        commissions.forEach((comm) => {
          if (comm.statut === "paid") {
            paidSum += Number(comm.montant);
          } else if (comm.payout_request_id === null) {
            claimableSum += Number(comm.montant);
          } else {
            pendingClaimSum += Number(comm.montant);
          }
        });
      }

      // 4. Filleuls directs recrutés (ceux dont le parent_affiliate_id correspond à cet affilié)
      const { count: filleulsCount } = await supabase
        .from("affiliates")
        .select("*", { count: "exact", head: true })
        .eq("parent_affiliate_id", userAffiliate.id);

      const clics = clicsCount || 0;
      const conversions = conversionsCount || 0;
      const tx = clics > 0 ? parseFloat(((conversions / clics) * 100).toFixed(1)) : 0;

      setStats({
        clics,
        conversions,
        gainsClaimable: claimableSum,
        gainsPendingClaim: pendingClaimSum,
        gainsPaid: paidSum,
        filleulsCount: filleulsCount || 0,
        tauxConversion: tx,
      });

      // Also fetch payout requests history
      fetchPayoutRequests();
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchMessages = async () => {
    if (!userAffiliate || !supabase) return;
    try {
      const { data, error } = await supabase
        .from("affiliate_messages")
        .select("*")
        .eq("affiliate_id", userAffiliate.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as AffiliateMessage[]);
        
        // Mark admin messages as read
        const unreadAdminMsgIds = data
          .filter((m) => m.sender === "admin" && !m.read_at)
          .map((m) => m.id);

        if (unreadAdminMsgIds.length > 0) {
          await supabase
            .from("affiliate_messages")
            .update({ read_at: new Date().toISOString() })
            .in("id", unreadAdminMsgIds);
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userAffiliate || !supabase || sendingMsg) return;

    setSendingMsg(true);
    try {
      const { error } = await supabase.from("affiliate_messages").insert({
        affiliate_id: userAffiliate.id,
        sender: "affiliate",
        message: newMessage.trim(),
      });

      if (!error) {
        setNewMessage("");
        fetchMessages();
      } else {
        console.error("Error sending message:", error);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  // Onboarding registration form submission
  const handleRegisterAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) {
      onOpenAuth();
      return;
    }

    if (!nomComplet.trim() || !telephone.trim() || !moyenPromotion.trim()) {
      setErrorMsg("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let parentId: string | null = null;
      // Get recruitment code (parrain) from localStorage
      const parrainCode = localStorage.getItem("ebookstore_parrain");
      if (parrainCode) {
        // Resolve referral code to affiliate ID
        const { data: parentRow, error: parentErr } = await supabase
          .from("affiliates")
          .select("id")
          .eq("referral_code", parrainCode)
          .maybeSingle();

        if (parentRow && !parentErr) {
          parentId = parentRow.id;
        }
      }

      if (userAffiliate && isRetrying) {
        // Resubmitting existing application
        const { error } = await supabase
          .from("affiliates")
          .update({
            nom_complet: nomComplet.trim(),
            telephone: telephone.trim(),
            moyen_promotion: moyenPromotion.trim(),
            lien_audience: lienAudience.trim() || null,
            status: "pending",
            motif_rejet: null,
            applied_at: new Date().toISOString(),
          })
          .eq("id", userAffiliate.id);

        if (error) throw error;
        setSuccessMsg("Votre candidature a été mise à jour et resoumise avec succès !");
        setIsRetrying(false);
      } else {
        // Brand-new application
        // Simple random unique code generator
        const generatedCode = "AFF_" + Math.random().toString(36).substring(2, 8).toUpperCase();

        const { error } = await supabase.from("affiliates").insert({
          user_id: user.id,
          parent_affiliate_id: parentId,
          referral_code: generatedCode,
          status: "pending",
          activated: false,
          nom_complet: nomComplet.trim(),
          telephone: telephone.trim(),
          moyen_promotion: moyenPromotion.trim(),
          lien_audience: lienAudience.trim() || null,
        });

        if (error) throw error;
        setSuccessMsg("Félicitations ! Votre demande d'affiliation a été envoyée avec succès.");
      }

      await onRefreshAffiliate(user.id);
    } catch (err: any) {
      console.error("Error creating affiliate:", err);
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  // Activation click trigger
  const handleActivateAccount = async () => {
    if (!userAffiliate || !supabase) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("affiliates")
        .update({ activated: true })
        .eq("id", userAffiliate.id);

      if (error) throw error;
      
      setSuccessMsg("Votre compte d'affilié est maintenant entièrement activé !");
      await onRefreshAffiliate(user!.id);
    } catch (err: any) {
      console.error("Error activating affiliate account:", err);
      setErrorMsg(err.message || "Impossible d'activer votre compte affilié.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "ref" | "recruit") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(type);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error("Could not copy:", err);
    }
  };

  const handleCopyLink = async (text: string, ebookId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEbookId(ebookId);
      setTimeout(() => setCopiedEbookId(null), 2000);
    } catch (err) {
      console.error("Could not copy ebook link:", err);
    }
  };

  const shareLink = async (title: string, text: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(url);
      alert("Lien copié dans le presse-papiers !");
    }
  };

  const handleSubmitPayoutRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !userAffiliate || stats.gainsClaimable <= 0) return;
    if (!payoutPhone.trim()) {
      setPayoutError("Veuillez saisir un numéro de téléphone mobile money.");
      return;
    }

    setSubmittingPayout(true);
    setPayoutError(null);
    setPayoutSuccess(false);

    try {
      // 1. Create a row in commission_payout_requests
      const { data: requestData, error: requestErr } = await supabase
        .from("commission_payout_requests")
        .insert({
          affiliate_id: userAffiliate.id,
          montant: stats.gainsClaimable,
          telephone_paiement: payoutPhone.trim(),
          statut: "pending",
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (requestErr) throw requestErr;

      // 2. Update associated pending commissions
      const { error: updateErr } = await supabase
        .from("affiliate_commissions")
        .update({
          payout_request_id: requestData.id
        })
        .eq("affiliate_id", userAffiliate.id)
        .eq("statut", "pending")
        .is("payout_request_id", null);

      if (updateErr) {
        console.error("Error linking commissions to payout request:", updateErr);
        throw updateErr;
      }

      setPayoutSuccess(true);
      setPayoutPhone("");
      await fetchDashboardStats();
      setTimeout(() => {
        setShowPayoutModal(false);
        setPayoutSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error("Error submitting payout request:", err);
      setPayoutError(err.message || "Une erreur est survenue lors de la soumission de votre demande.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Render NOT CONNECTED
  if (!user) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 my-16 bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm">
        <div className="h-16 w-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100">
          <Coins className="h-9 w-9 text-indigo-600 animate-pulse" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Programme d'Affiliation EbookStore</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Rejoignez notre programme d'affiliation à plusieurs niveaux (pyramidal) et commencez à générer des gains passifs immédiats en recommandant nos ebooks.
          </p>
          <div className="grid grid-cols-3 gap-2.5 pt-4 text-left">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
              <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Niveau 1</span>
              <span className="text-lg font-bold text-indigo-600">20%</span>
              <span className="block text-[10px] text-slate-500 mt-1">Sur vos ventes directes</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
              <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Niveau 2</span>
              <span className="text-lg font-bold text-indigo-600">5%</span>
              <span className="block text-[10px] text-slate-500 mt-1">Sur vos filleuls directs</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
              <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Niveau 3</span>
              <span className="text-lg font-bold text-indigo-600">2%</span>
              <span className="block text-[10px] text-slate-500 mt-1">Sur les filleuls de vos filleuls</span>
            </div>
          </div>
        </div>
        <button
          onClick={onOpenAuth}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
        >
          Se connecter pour s'inscrire
        </button>
      </div>
    );
  }

  // Render FORM / ONBOARDING
  if (!userAffiliate || isRetrying) {
    const parentCode = localStorage.getItem("ebookstore_parrain");

    return (
      <div className="max-w-2xl mx-auto space-y-8 my-8">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          {/* Header */}
          <div className="border-b border-slate-100 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <Coins className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 tracking-tight">
                  {isRetrying ? "Mettre à jour ma candidature d'affilié" : "Devenir Partenaire Affilié"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recommandez, recrutez et gagnez sur 3 niveaux de commissions cumulatives.
                </p>
              </div>
            </div>

            {parentCode && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <UserPlus className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Vous êtes parrainé par l'affilié de code <strong>{parentCode}</strong>.</span>
              </div>
            )}
          </div>

          {/* Informational Warning on Required Paid Purchase */}
          {!purchases.some((p) => p.statut === "paid" && p.montant > 0) && (
            <div className="p-4 bg-amber-50 border border-amber-150 rounded-2xl flex items-start gap-3 text-amber-800 mb-6 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 animate-pulse" />
              <div>
                <strong className="block font-bold mb-0.5">Information importante :</strong>
                Vous devez avoir effectué au moins un achat payant avant que votre candidature ne puisse être validée par l'administrateur (les ebooks gratuits ne sont pas éligibles).
              </div>
            </div>
          )}

          {/* Error and Success alerts */}
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-150 rounded-2xl flex items-start gap-3 text-red-800 mb-6 text-xs">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-2xl flex items-start gap-3 text-emerald-800 mb-6 text-xs">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegisterAffiliate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Nom complet *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Dupont"
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Téléphone *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 699443322"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Moyen de promotion *</label>
              <textarea
                required
                rows={4}
                placeholder="Expliquez brièvement comment vous allez promouvoir nos ebooks (groupes WhatsApp, réseaux sociaux, blogs, mailing, bouche-à-oreille...)"
                value={moyenPromotion}
                onChange={(e) => setMoyenPromotion(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-250 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 leading-relaxed"
              ></textarea>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Lien vers votre audience (optionnel)</label>
              <input
                type="url"
                placeholder="Ex: https://facebook.com/moncompte ou https://instagram.com/moncompte"
                value={lienAudience}
                onChange={(e) => setLienAudience(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-250 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
              />
              <span className="text-[10px] text-slate-400 font-mono block">Lien vers votre page, groupe ou chaîne si applicable</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Soumission en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Soumettre ma candidature d'affilié</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Render PENDING STATE
  if (userAffiliate.status === "pending") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 my-16 bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm animate-in fade-in duration-300">
        <div className="h-16 w-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100">
          <Clock className="h-9 w-9 text-amber-600 animate-pulse" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Candidature en cours d'examen</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Votre demande d'onboarding a été bien reçue et est en cours de validation par notre gérant. Nous examinons votre moyen de promotion pour valider votre entrée dans le programme.
          </p>
          <div className="p-4 bg-amber-50/50 border border-amber-150 rounded-xl text-xs text-amber-900 text-left space-y-1">
            <span className="block font-bold">Récapitulatif envoyé :</span>
            <span className="block font-medium">Nom : {userAffiliate.nom_complet}</span>
            <span className="block text-slate-500 line-clamp-2 mt-1">Promotion : {userAffiliate.moyen_promotion}</span>
          </div>
          <p className="text-xs text-slate-400 font-mono italic pt-2">Date de soumission : {new Date(userAffiliate.applied_at || "").toLocaleDateString()}</p>
        </div>
        
        <button
          onClick={() => onRefreshAffiliate(user.id)}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Actualiser le statut</span>
        </button>
      </div>
    );
  }

  // Render REJECTED STATE
  if (userAffiliate.status === "rejected") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 my-16 bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-sm animate-in fade-in duration-300">
        <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
          <XCircle className="h-9 w-9 text-rose-600" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight text-rose-950">Candidature refusée</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Malheureusement, votre candidature d'affilié n'a pas pu être acceptée par notre équipe.
          </p>
          
          {userAffiliate.motif_rejet && (
            <div className="p-4 bg-rose-50/50 border border-rose-150 rounded-xl text-left text-xs text-rose-900">
              <span className="block font-bold mb-1">Motif du refus :</span>
              <p className="italic leading-relaxed">"{userAffiliate.motif_rejet}"</p>
            </div>
          )}
        </div>
        
        <button
          onClick={() => setIsRetrying(true)}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Modifier et réessayer (Réclamer à nouveau)</span>
        </button>
      </div>
    );
  }

  // Render APPROVED but NOT ACTIVATED
  if (userAffiliate.status === "approved" && !userAffiliate.activated) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 my-16 bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 shadow-md animate-in fade-in duration-300">
        <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <div className="space-y-3">
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Félicitations, vous êtes accepté !</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Votre candidature a été approuvée avec succès ! Il ne vous reste plus qu'à activer votre compte pour dévoiler votre tableau de bord et récupérer vos liens d'affiliation uniques.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-800 text-xs text-left">
            {errorMsg}
          </div>
        )}

        <button
          onClick={handleActivateAccount}
          disabled={loading}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow shadow-emerald-600/10"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          <span>Activer mon compte affilié</span>
        </button>
      </div>
    );
  }

  // Render ACTIVE DASHBOARD PORTAL
  // Referral urls based on current domain
  const currentDomain = window.location.origin;
  const affiliateUrl = `${currentDomain}/?ref=${userAffiliate.referral_code}`;
  const recruitUrl = `${currentDomain}/affiliation?parrain=${userAffiliate.referral_code}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-950/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-emerald-500/10 backdrop-blur-md text-emerald-300 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-500/20 font-mono flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              Affilié Partenaire Actif
            </span>
            <span className="text-slate-400 font-mono text-[10px]">Code : <strong>{userAffiliate.referral_code}</strong></span>
          </div>
          <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-white leading-none">
            Bonjour, {userAffiliate.nom_complet} !
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
            Voici votre espace d'affiliation à plusieurs niveaux. Partagez votre lien d'audience ou recrutez de nouveaux parrains pour décupler vos gains.
          </p>
        </div>
        
        <button
          onClick={fetchDashboardStats}
          disabled={loadingStats}
          className="p-2.5 bg-white/10 hover:bg-white/15 text-slate-100 rounded-xl border border-white/10 cursor-pointer self-end md:self-auto flex items-center gap-2 text-xs font-mono"
        >
          <RefreshCw className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
          <span>Actualiser les stats</span>
        </button>
      </div>

      {/* Liens d'Affiliation par Ebook */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            <span>Vos Liens d'Affiliation par Ebook</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Partagez le lien personnalisé de n'importe quel ebook pour gagner <strong>20% de commission</strong> sur chaque vente. Vos recrues rejoindront automatiquement votre équipe.
          </p>
        </div>

        {ebooks.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Aucun ebook disponible dans le catalogue.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-72 overflow-y-auto pr-1">
            {ebooks.map((ebook) => {
              const personalLink = `${window.location.origin}/ebook/${ebook.id}?ref=${userAffiliate.referral_code}`;
              const isCopied = copiedEbookId === ebook.id;

              return (
                <div key={ebook.id} className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl items-center hover:border-indigo-300 transition-all">
                  <img
                    src={ebook.url_couverture || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=100"}
                    alt={ebook.titre}
                    referrerPolicy="no-referrer"
                    className="w-10 h-14 object-cover rounded-md shadow-sm border border-slate-200 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=100";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono block mb-0.5">{ebook.categorie}</span>
                    <h4 className="font-semibold text-xs text-slate-900 truncate">{ebook.titre}</h4>
                    <span className="text-[10px] font-bold text-indigo-600 font-mono block mt-0.5">
                      {ebook.prix === 0 ? "GRATUIT" : `${ebook.prix.toLocaleString()} FCFA`}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyLink(personalLink, ebook.id)}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl cursor-pointer transition-all shrink-0"
                      title="Copier mon lien d'affilié"
                    >
                      {isCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => shareLink(ebook.titre, `Découvrez l'ebook "${ebook.titre}" sur notre Store !`, personalLink)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl cursor-pointer transition-all shrink-0"
                      title="Partager"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Trafic (clics)</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-display text-slate-900">
              {loadingStats ? "..." : stats.clics}
            </span>
            <span className="text-xs text-slate-400 font-mono">clics</span>
          </div>
          <div className="absolute right-3.5 bottom-3 text-slate-100 select-none">
            <ExternalLink className="h-8 w-8 text-slate-100" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <span className="block text-[10px] uppercase font-mono font-bold text-slate-400">Ventes directes</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-2xl font-bold font-display text-slate-900">
              {loadingStats ? "..." : stats.conversions}
            </span>
            <span className="text-xs text-slate-400 font-mono">conversions</span>
          </div>
          <div className="absolute right-3.5 bottom-3 text-indigo-50 select-none">
            <TrendingUp className="h-8 w-8 text-indigo-50" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden ring-2 ring-indigo-500/20">
          <span className="block text-[10px] uppercase font-mono font-bold text-indigo-500">Gains Réclamables</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-black font-mono text-indigo-600">
              {loadingStats ? "..." : stats.gainsClaimable.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">FCFA</span>
          </div>
          <div className="absolute right-3.5 bottom-3 text-indigo-50 select-none">
            <DollarSign className="h-8 w-8 text-indigo-50" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <span className="block text-[10px] uppercase font-mono font-bold text-amber-500">En cours de paiement</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-black font-mono text-amber-600">
              {loadingStats ? "..." : stats.gainsPendingClaim.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">FCFA</span>
          </div>
          <div className="absolute right-3.5 bottom-3 text-amber-50 select-none">
            <Clock className="h-8 w-8 text-amber-50" />
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <span className="block text-[10px] uppercase font-mono font-bold text-emerald-500">Gains Payés</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-black font-mono text-emerald-600">
              {loadingStats ? "..." : stats.gainsPaid.toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">FCFA</span>
          </div>
          <div className="absolute right-3.5 bottom-3 text-emerald-50 select-none">
            <CheckCircle2 className="h-8 w-8 text-emerald-50" />
          </div>
        </div>

      </div>

      {/* Retrait des gains & Historique */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Coins className="h-5 w-5 text-indigo-600" />
              <span>Réclamation des Gains d'Affiliation</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Vous avez un solde réclamable de <strong className="text-indigo-650 font-mono font-bold">{stats.gainsClaimable.toLocaleString()} FCFA</strong>. Demandez un transfert vers votre compte Mobile Money.
            </p>
          </div>
          
          <button
            onClick={() => {
              setPayoutPhone(userAffiliate.telephone || "");
              setShowPayoutModal(false);
              setPayoutError(null);
              setPayoutSuccess(false);
              setShowPayoutModal(true);
            }}
            disabled={stats.gainsClaimable <= 0}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm disabled:shadow-none flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Coins className="h-4 w-4" />
            <span>Réclamer mes gains</span>
          </button>
        </div>

        {/* Historique des Demandes */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Historique de vos paiements</h4>
          
          {loadingPayouts ? (
            <div className="flex items-center justify-center py-6">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : payoutRequests.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Aucune demande de paiement pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Montant</th>
                    <th className="py-2 px-3">Compte Mobile Money</th>
                    <th className="py-2 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payoutRequests.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {new Date(p.requested_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-slate-900">
                        {p.montant.toLocaleString()} FCFA
                      </td>
                      <td className="py-3 px-3 text-slate-600 font-mono">
                        {p.telephone_paiement}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider font-mono ${
                          p.statut === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : p.statut === "rejected"
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {p.statut === "paid" ? "Payé" : p.statut === "rejected" ? "Rejeté" : "En attente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-2xl transition-all sm:w-full sm:max-w-md border border-slate-200">
              <h3 className="font-display font-black text-lg text-slate-900">Réclamer mes gains</h3>
              <p className="text-xs text-slate-500 mt-1">
                Saisissez votre numéro MTN Mobile Money ou Orange Money pour recevoir vos gains d'affiliation de <strong className="text-indigo-650 font-mono font-bold">{stats.gainsClaimable.toLocaleString()} FCFA</strong>.
              </p>

              {payoutError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-800">
                  {payoutError}
                </div>
              )}

              {payoutSuccess ? (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-150 rounded-xl text-xs text-emerald-800 space-y-1">
                  <span className="font-bold block">🎉 Demande de paiement soumise !</span>
                  <span className="block text-[11px]">Votre demande de transfert est enregistrée. L'administrateur validera le paiement d'ici quelques instants.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitPayoutRequest} className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Numéro de téléphone paiement *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 699443322 (Orange/MTN)"
                        value={payoutPhone}
                        onChange={(e) => setPayoutPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPayoutModal(false)}
                      className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPayout}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
                    >
                      {submittingPayout ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>Traitement...</span>
                        </>
                      ) : (
                        <span>Confirmer le retrait</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Network Size & Messenger columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Network Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <span>Votre Réseau d'Affiliés</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Vous gagnez des commissions indirectes sur les ventes faites par les membres que vous avez recrutés :
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-150">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-mono text-xs font-bold">1</div>
                  <span className="text-xs font-semibold text-slate-700">Filleuls Directs</span>
                </div>
                <span className="text-sm font-bold text-slate-900 font-mono">{stats.filleulsCount}</span>
              </div>

              <div className="p-3 bg-indigo-50/20 border border-indigo-150/40 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                🚀 Multipliez vos liens de recrutement sur vos réseaux. Dès que vos filleuls réalisent des ventes, vous touchez <strong>5% (niveau 2)</strong>, puis <strong>2% (niveau 3)</strong> sans effort supplémentaire !
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Messenger chat with Admin */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col h-[400px] justify-between">
            {/* Thread Header */}
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <MessageSquare className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 leading-none">Support & Messagerie Admin</h3>
                  <span className="text-[10px] text-slate-400">Posez vos questions au gérant directement ici.</span>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 bg-slate-100 rounded-full text-slate-500 font-mono">Discussions</span>
            </div>

            {/* Bubble list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1" style={{ maxHeight: "250px" }}>
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-350" />
                  <p className="text-xs text-slate-500">Aucun message pour le moment. Envoyez un message ci-dessous pour démarrer la discussion.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.sender === "admin";
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? "justify-start" : "justify-end"} items-end gap-1.5 animate-in fade-in duration-200`}
                    >
                      {isAdmin && (
                        <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                          AD
                        </div>
                      )}
                      <div className="space-y-0.5 max-w-[80%]">
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          isAdmin 
                            ? "bg-slate-100 text-slate-800 rounded-bl-none" 
                            : "bg-indigo-600 text-white rounded-br-none"
                        }`}>
                          {msg.message}
                        </div>
                        <span className="block text-[8px] text-slate-400 font-mono px-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-100 pt-3 flex gap-2 shrink-0">
              <input
                type="text"
                placeholder="Écrivez votre message ici..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 text-slate-800"
              />
              <button
                type="submit"
                disabled={sendingMsg || !newMessage.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
              >
                {sendingMsg ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
