import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Database, 
  ShieldCheck, 
  DollarSign, 
  ListOrdered, 
  Code, 
  ArrowUpRight, 
  HelpCircle, 
  FileText, 
  UploadCloud, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Users,
  Check,
  X,
  Coins,
  MessageSquare,
  Send,
  RefreshCw,
  Phone,
  ExternalLink,
  Clock
} from "lucide-react";
import { Ebook, Achat } from "../types";
import { API_BASE_URL } from "../supabaseClient";

interface AdminPanelProps {
  ebooks: Ebook[];
  onAddEbook: (ebook: Omit<Ebook, "id">) => Promise<{ success: boolean; error?: string }>;
  onDeleteEbook: (id: string) => Promise<boolean>;
  configStatus: any;
}

export default function AdminPanel({ ebooks, onAddEbook, onDeleteEbook, configStatus }: AdminPanelProps) {
  // Tabs & Layout
  const [activeTab, setActiveTab] = useState<"books" | "affiliates">("books");

  // Core Ebook & Tx States
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [prix, setPrix] = useState("");
  const [urlCouverture, setUrlCouverture] = useState("");
  const [urlFichier, setUrlFichier] = useState("");
  const [categorie, setCategorie] = useState("Programmation");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadingCouverture, setUploadingCouverture] = useState(false);
  const [progressCouverture, setProgressCouverture] = useState(0);
  const [couvertureName, setCouvertureName] = useState("");

  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [progressPdf, setProgressPdf] = useState(0);
  const [pdfName, setPdfName] = useState("");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Affiliates Administration States
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [selectedChatAffiliate, setSelectedChatAffiliate] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [motifRefusText, setMotifRefusText] = useState<{ [key: string]: string }>({});
  const [showRefusInput, setShowRefusInput] = useState<{ [key: string]: boolean }>({});

  const [adminPayoutRequests, setAdminPayoutRequests] = useState<any[]>([]);
  const [loadingAdminPayouts, setLoadingAdminPayouts] = useState(false);

  const fetchPayoutRequestsAdmin = async () => {
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;
      setLoadingAdminPayouts(true);
      const { data, error } = await supabase
        .from("commission_payout_requests")
        .select(`
          id,
          affiliate_id,
          montant,
          telephone_paiement,
          statut,
          requested_at,
          processed_at
        `)
        .order("requested_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setAdminPayoutRequests(data);
      }
    } catch (e) {
      console.error("Error loading payout requests in admin:", e);
    } finally {
      setLoadingAdminPayouts(false);
    }
  };

  const fetchAffiliatesData = async () => {
    try {
      const { supabase, hasSupabaseKeys } = await import("../supabaseClient");
      if (!hasSupabaseKeys || !supabase) return;
      setLoadingAffiliates(true);

      // Fetch payout requests too
      fetchPayoutRequestsAdmin();

      const { data: affList, error: affErr } = await supabase
        .from("affiliates")
        .select("*")
        .order("applied_at", { ascending: false });

      if (affErr) throw affErr;

      const { data: achatsData } = await supabase
        .from("achats")
        .select("id, affiliate_id, statut")
        .eq("statut", "paid");

      const { data: commissionsData } = await supabase
        .from("affiliate_commissions")
        .select("id, affiliate_id, montant");

      const list = (affList || []).map((aff) => {
        const salesCount = (achatsData || []).filter(ac => ac.affiliate_id === aff.id).length;
        const commissionsSum = (commissionsData || [])
          .filter(c => c.affiliate_id === aff.id)
          .reduce((acc, curr) => acc + Number(curr.montant), 0);
        const daughterCount = (affList || []).filter(a => a.parent_affiliate_id === aff.id).length;

        return {
          ...aff,
          salesCount,
          commissionsSum,
          daughterCount
        };
      });

      setAffiliates(list);
    } catch (err) {
      console.error("Error fetching admin affiliates:", err);
    } finally {
      setLoadingAffiliates(false);
    }
  };

  const fetchChatMessages = async (affId: string) => {
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;
      const { data, error } = await supabase
        .from("affiliate_messages")
        .select("*")
        .eq("affiliate_id", affId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setChatMessages(data);
      }
    } catch (e) {
      console.error("Error loading chat messages for admin:", e);
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatAffiliate || !adminReplyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      const { error } = await supabase.from("affiliate_messages").insert({
        affiliate_id: selectedChatAffiliate.id,
        sender: "admin",
        message: adminReplyText.trim()
      });

      if (!error) {
        setAdminReplyText("");
        fetchChatMessages(selectedChatAffiliate.id);
      }
    } catch (err) {
      console.error("Error sending admin reply:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleAcceptAffiliate = async (id: string) => {
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      // 1. Fetch affiliate to get user_id and nom_complet
      const { data: aff, error: affErr } = await supabase
        .from("affiliates")
        .select("user_id, nom_complet")
        .eq("id", id)
        .single();

      if (affErr) throw affErr;
      if (!aff) throw new Error("Affilié introuvable");

      // 2. Query achats where user_id is the user's ID, statut is paid and montant > 0
      const { data: userPurchases, error: purchaseErr } = await supabase
        .from("achats")
        .select("id, montant, statut")
        .eq("user_id", aff.user_id)
        .eq("statut", "paid")
        .gt("montant", 0);

      if (purchaseErr) throw purchaseErr;

      if (!userPurchases || userPurchases.length === 0) {
        alert(
          `Approbation impossible : L'utilisateur ${aff.nom_complet} n'a effectué aucun achat payé. Un achat avec montant supérieur à 0 FCFA est requis pour approuver un affilié (les ebooks gratuits ne comptent pas).`
        );
        return;
      }

      const { error } = await supabase
        .from("affiliates")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      await fetchAffiliatesData();
    } catch (err: any) {
      console.error("Error approving affiliate:", err);
      alert(`Erreur lors de l'approbation : ${err.message}`);
    }
  };

  const handleMarkPayoutAsPaid = async (requestId: string) => {
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      const confirmPay = window.confirm("Confirmez-vous le versement de ce paiement ? Les commissions associées passeront définitivement au statut 'payé'.");
      if (!confirmPay) return;

      // 1. Update status of the payout request to 'paid'
      const { error: requestErr } = await supabase
        .from("commission_payout_requests")
        .update({
          statut: "paid",
          processed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestErr) throw requestErr;

      // 2. Update all associated commissions to 'paid'
      const { error: commissionErr } = await supabase
        .from("affiliate_commissions")
        .update({
          statut: "paid"
        })
        .eq("payout_request_id", requestId);

      if (commissionErr) throw commissionErr;

      alert("Demande de paiement validée et marquée comme payée avec succès !");
      await fetchPayoutRequestsAdmin();
      await fetchAffiliatesData();
    } catch (err: any) {
      console.error("Error processing payout request payment:", err);
      alert(`Erreur lors de la validation du paiement : ${err.message}`);
    }
  };

  const handleRejectPayoutRequest = async (requestId: string) => {
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      const confirmReject = window.confirm("Voulez-vous rejeter cette demande de paiement ? Les commissions associées redeviennent réclamables (leur payout_request_id repassera à NULL).");
      if (!confirmReject) return;

      // 1. Update request status to 'rejected'
      const { error: requestErr } = await supabase
        .from("commission_payout_requests")
        .update({
          statut: "rejected",
          processed_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestErr) throw requestErr;

      // 2. Reset payout_request_id in commissions so they become claimable again
      const { error: commissionErr } = await supabase
        .from("affiliate_commissions")
        .update({
          payout_request_id: null
        })
        .eq("payout_request_id", requestId);

      if (commissionErr) throw commissionErr;

      alert("Demande de paiement rejetée avec succès.");
      await fetchPayoutRequestsAdmin();
      await fetchAffiliatesData();
    } catch (err: any) {
      console.error("Error rejecting payout request:", err);
      alert(`Erreur lors du rejet : ${err.message}`);
    }
  };

  const handleRejectAffiliate = async (id: string) => {
    const motif = motifRefusText[id] || "";
    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      const { error } = await supabase
        .from("affiliates")
        .update({
          status: "rejected",
          motif_rejet: motif.trim() || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      await fetchAffiliatesData();
    } catch (err) {
      console.error("Error rejecting affiliate:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "affiliates") {
      fetchAffiliatesData();
    }
  }, [activeTab]);

  // Fetch transaction history
  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const { supabase, hasSupabaseKeys } = await import("../supabaseClient");
      if (hasSupabaseKeys && supabase) {
        const { data, error } = await supabase
          .from("achats")
          .select("*, ebook:ebooks(titre)")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setTransactions(data || []);
        return;
      }

      // Fallback
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session ? `Bearer ${session.access_token}` : "";

      const res = await fetch(`${API_BASE_URL}/api/transactions`, {
        headers: {
          "Authorization": token
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [ebooks]);

  const handleCouvertureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingCouverture(true);
    setProgressCouverture(0);
    setCouvertureName(file.name);

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Le fichier de couverture doit être une image (PNG, JPG, WEBP, etc.).");
      setUploadingCouverture(false);
      return;
    }

    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("L'image de couverture est trop lourde (max 10 Mo).");
      setUploadingCouverture(false);
      return;
    }

    // Simulated progress bar
    const interval = setInterval(() => {
      setProgressCouverture((prev) => {
        if (prev >= 90) return prev;
        return prev + 10;
      });
    }, 100);

    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) {
        throw new Error("Client Supabase non initialisé.");
      }

      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;

      const { data, error: uploadErr } = await supabase.storage
        .from("couvertures")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        throw uploadErr;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("couvertures")
        .getPublicUrl(fileName);

      setUrlCouverture(publicUrlData.publicUrl);
      setProgressCouverture(100);
    } catch (err: any) {
      console.error("Cover upload error:", err);
      setError("Erreur lors du téléversement de la couverture : " + (err.message || err));
      setCouvertureName("");
      setUrlCouverture("");
    } finally {
      clearInterval(interval);
      setUploadingCouverture(false);
    }
  };

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingPdf(true);
    setProgressPdf(0);
    setPdfName(file.name);

    // Validate type
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setError("Le fichier doit obligatoirement être un document PDF.");
      setUploadingPdf(false);
      return;
    }

    // Validate size (100 MB)
    if (file.size > 100 * 1024 * 1024) {
      setError("Le fichier PDF est trop lourd (max 100 Mo).");
      setUploadingPdf(false);
      return;
    }

    // Simulated progress bar
    const interval = setInterval(() => {
      setProgressPdf((prev) => {
        if (prev >= 95) return prev;
        return prev + 5;
      });
    }, 150);

    try {
      const { supabase } = await import("../supabaseClient");
      if (!supabase) {
        throw new Error("Client Supabase non initialisé.");
      }

      const fileExt = file.name.split(".").pop() || "pdf";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;

      const { data, error: uploadErr } = await supabase.storage
        .from("ebooks-fichiers")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        throw uploadErr;
      }

      setUrlFichier(fileName);
      setProgressPdf(100);
    } catch (err: any) {
      console.error("PDF upload error:", err);
      setError("Erreur lors du téléversement du PDF : " + (err.message || err));
      setPdfName("");
      setUrlFichier("");
    } finally {
      clearInterval(interval);
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    if (!titre || !description || prix === "" || !urlCouverture || !urlFichier || !categorie) {
      setError("Veuillez remplir tous les champs requis et téléverser les fichiers.");
      setLoading(false);
      return;
    }

    // Clean and validate the price (numeric)
    const cleanedPrix = prix.toString().replace(/,/g, ".").replace(/\s/g, "");
    const parsedPrix = Number(cleanedPrix);
    if (isNaN(parsedPrix) || parsedPrix < 0) {
      setError("Le prix saisi n'est pas un nombre valide. Veuillez entrer uniquement des chiffres (ex : 5000, 0 ou 49.99).");
      setLoading(false);
      return;
    }

    try {
      const result = await onAddEbook({
        titre: titre.trim(),
        description: description.trim(),
        prix: parsedPrix,
        url_couverture: urlCouverture.trim(),
        url_fichier_storage: urlFichier.trim(),
        categorie: categorie.trim(),
      });

      if (result.success) {
        setSuccess(true);
        setTitre("");
        setDescription("");
        setPrix("");
        setUrlCouverture("");
        setUrlFichier("");
        setCouvertureName("");
        setPdfName("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Échec de la création de l'ebook.");
      }
    } catch (err: any) {
      console.error("Exception in handleSubmit:", err);
      setError("Une exception est survenue lors de l'enregistrement : " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet ebook ?")) {
      const deleted = await onDeleteEbook(id);
      if (deleted) {
        // Updated state inside parent automatically
      } else {
        alert("Impossible de supprimer cet ebook.");
      }
    }
  };

  return (
    <div className="space-y-10 font-sans" id="admin-panel">
      {/* Intro Section */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full font-mono">
            Espace d'Administration
          </span>
          <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight leading-none">
            Back-Office de Gestion
          </h2>
          <p className="text-xs sm:text-sm text-slate-350 leading-relaxed">
            Ajoutez de nouvelles oeuvres, gérez les articles en vente, examinez les transactions mobile money de vos clients et inspectez les connexions aux services cloud.
          </p>
        </div>
        {/* Abstract background vector */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
          <Database className="w-full h-full text-white" />
        </div>
      </div>

      {/* Tabs Selector Bar */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto shrink-0 pb-px">
        <button
          onClick={() => setActiveTab("books")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "books"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/10"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <ListOrdered className="h-4 w-4 shrink-0" />
          <span>Catalogue & Ventes</span>
        </button>
        <button
          onClick={() => setActiveTab("affiliates")}
          className={`flex items-center gap-2 px-6 py-3.5 font-bold text-xs sm:text-sm border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "affiliates"
              ? "border-indigo-600 text-indigo-600 bg-indigo-50/10"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>Candidatures & Affiliations</span>
        </button>
      </div>

      {activeTab === "books" ? (
        <>
          {/* Grid: Forms & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" /> Ajouter un Ebook
            </h3>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-100 font-mono">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-xl border border-emerald-100 font-semibold">
              Ebook enregistré avec succès ! Il est instantanément visible sur le catalogue.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1.5">Titre de l'ebook *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Devenir Pro en React"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider font-mono mb-1.5">Prix (en FCFA) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="Ex : 4500"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1.5">Description de l'ouvrage *</label>
              <textarea
                required
                rows={3}
                placeholder="Ex : Apprenez pas-à-pas les concepts indispensables..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1.5">Catégorie *</label>
                <select
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                >
                  <option value="Programmation">Programmation</option>
                  <option value="Design">Design</option>
                  <option value="Business">Business</option>
                  <option value="Développement Personnel">Développement Personnel</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1">
                  Image de Couverture *
                </label>
                <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-3 hover:bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center text-center group min-h-[96px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCouvertureChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    disabled={uploadingCouverture}
                  />
                  {urlCouverture ? (
                    <div className="flex items-center gap-3 w-full text-left">
                      <img
                        src={urlCouverture}
                        alt="Aperçu"
                        className="h-14 w-10 object-cover rounded shadow-sm shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="overflow-hidden flex-1 space-y-0.5">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{couvertureName || "couverture.png"}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <CheckCircle className="h-2.5 w-2.5" /> Téléversé
                        </span>
                      </div>
                    </div>
                  ) : uploadingCouverture ? (
                    <div className="w-full space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                        <span className="flex items-center gap-1 font-mono">
                          <Loader2 className="h-3 w-3 animate-spin text-indigo-600" /> Image...
                        </span>
                        <span>{progressCouverture}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressCouverture}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 mx-auto transition-colors" />
                      <p className="text-[11px] font-bold text-slate-700">Choisir une image</p>
                      <p className="text-[9px] text-slate-400">PNG, JPG, WEBP (Max 10Mo)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1">
                Document PDF de l'Ouvrage *
              </label>
              <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-4 hover:bg-slate-50 hover:border-indigo-400 transition-all cursor-pointer flex flex-col items-center justify-center text-center group min-h-[96px]">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  disabled={uploadingPdf}
                />
                {urlFichier ? (
                  <div className="flex items-center gap-3 w-full text-left">
                    <div className="h-11 w-11 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="h-5.5 w-5.5" />
                    </div>
                    <div className="overflow-hidden flex-1 space-y-0.5">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{pdfName || "ebook.pdf"}</p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <CheckCircle className="h-2.5 w-2.5" /> Téléversé
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono truncate max-w-[140px]">
                          Chemin: {urlFichier}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : uploadingPdf ? (
                  <div className="w-full space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                      <span className="flex items-center gap-1 font-mono">
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-600" /> PDF...
                      </span>
                      <span>{progressPdf}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progressPdf}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 mx-auto transition-colors" />
                    <p className="text-[11px] font-bold text-slate-700">Choisir le fichier PDF</p>
                    <p className="text-[9px] text-slate-400">PDF uniquement (Max 100Mo)</p>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 block leading-normal">
                Ce fichier sera stocké de manière privée et cryptée sur le bucket <strong>"ebooks-fichiers"</strong>.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || uploadingCouverture || uploadingPdf || !urlCouverture || !urlFichier}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow hover:shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enregistrement...
                </>
              ) : uploadingCouverture || uploadingPdf ? (
                "Téléversement en cours..."
              ) : !urlCouverture || !urlFichier ? (
                "Téléversez la couverture et le PDF"
              ) : (
                "Enregistrer l'Ebook"
              )}
            </button>
          </form>
        </div>

        {/* Configuration Overview Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Integration Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="h-4.5 w-4.5 text-slate-600" /> Statut d'Intégration Cloud
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Boutique Production</span>
                <span className="px-2 py-0.5 rounded-full font-bold font-mono text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100">
                  PRODUCTION
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-sans">Endpoint Supabase</span>
                  <span className="text-slate-400 font-mono text-[10px]">SUPABASE_URL</span>
                </div>
                <span className={`block p-2 rounded-lg text-[10px] font-mono border truncate max-w-full ${
                  configStatus.supabaseUrl.includes("Erreur")
                    ? "bg-rose-50 border-rose-150 text-rose-850"
                    : configStatus.supabaseUrl.includes("Chargement")
                    ? "bg-slate-50 border-slate-100 text-slate-500"
                    : "bg-emerald-50 border-emerald-100 text-emerald-800 font-medium"
                }`}>
                  {configStatus.supabaseUrl}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-sans">Service Role Access</span>
                  <span className="text-slate-400 font-mono text-[10px]">SUPABASE_SERVICE_KEY</span>
                </div>
                <span className={`block p-2 rounded-lg text-[10px] font-mono border text-center ${
                  configStatus.supabaseServiceKey.includes("Erreur")
                    ? "bg-rose-50 border-rose-150 text-rose-850 font-bold"
                    : configStatus.supabaseServiceKey.includes("Chargement")
                    ? "bg-slate-50 border-slate-100 text-slate-500"
                    : "bg-emerald-50 border-emerald-100 text-emerald-800 font-bold"
                }`}>
                  {configStatus.supabaseServiceKey}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-sans">MoneyFusion Payment API</span>
                  <span className="text-slate-400 font-mono text-[10px]">MONEYFUSION_URL</span>
                </div>
                <span className={`block p-2 rounded-lg text-[10px] font-mono border truncate max-w-full ${
                  configStatus.moneyfusionUrl.includes("Erreur")
                    ? "bg-rose-50 border-rose-150 text-rose-850"
                    : configStatus.moneyfusionUrl.includes("Chargement")
                    ? "bg-slate-50 border-slate-100 text-slate-500"
                    : "bg-emerald-50 border-emerald-100 text-emerald-800 font-medium"
                }`}>
                  {configStatus.moneyfusionUrl}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Manager Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
          <ListOrdered className="h-5 w-5 text-slate-600" /> Livres du Catalogue ({ebooks.length})
        </h3>

        {ebooks.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Aucun ebook enregistré dans la base de données.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Couverture</th>
                  <th className="py-3 px-4">Titre / Catégorie</th>
                  <th className="py-3 px-4">Fichier Storage</th>
                  <th className="py-3 px-4 text-right">Prix</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ebooks.map((eb) => (
                  <tr key={eb.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={eb.url_couverture}
                        alt={eb.titre}
                        className="w-10 h-14 object-cover rounded shadow-sm border border-slate-200"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{eb.titre}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono mt-1 inline-block uppercase">
                        {eb.categorie}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10.5px] text-slate-500 flex items-center gap-1">
                        <FileText className="h-3 w-3 text-slate-400" /> {eb.url_fichier_storage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {eb.prix.toLocaleString()} FCFA
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(eb.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Supprimer du catalogue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" /> Historique des Transactions Mobile Money
          </h3>
          <button
            onClick={fetchTransactions}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Rafraîchir les Logs
          </button>
        </div>

        {loadingTx ? (
          <p className="text-xs text-slate-500 text-center py-6">Chargement des transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">Aucune transaction enregistrée dans l'historique.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-mono font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Token Transaction</th>
                  <th className="py-3 px-4">ID Client</th>
                  <th className="py-3 px-4">Livre Commandé</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700 block select-all">{tx.token_pay}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {tx.user_id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {tx.ebook?.titre || "N/A (ebook supprimé)"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {tx.montant ? tx.montant.toLocaleString() : "0"} FCFA
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-mono text-[9px] uppercase border ${
                        tx.statut === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : tx.statut === "pending"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {tx.statut}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </>
      ) : (
        /* AFFILIATES TAB CONTENT */
        <div className="space-y-10">
          
          {/* Section 1: Pending Applications */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" /> Candidatures Affiliés en Attente ({
                  affiliates.filter(a => a.status === "pending").length
                })
              </h3>
              <button
                onClick={fetchAffiliatesData}
                disabled={loadingAffiliates}
                className="p-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${loadingAffiliates ? 'animate-spin' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {loadingAffiliates ? (
              <p className="text-xs text-slate-500 text-center py-6">Chargement des données d'affiliation...</p>
            ) : affiliates.filter(a => a.status === "pending").length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 bg-slate-50 border border-slate-100 rounded-xl">Aucune candidature en attente d'approbation.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {affiliates.filter(a => a.status === "pending").map((cand) => (
                  <div key={cand.id} className="p-4 border border-slate-200 bg-slate-50/50 rounded-2xl space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{cand.nom_complet}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Date : {new Date(cand.applied_at || "").toLocaleDateString()}</span>
                      </div>
                      <a
                        href={`tel:${cand.telephone}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-lg font-mono transition-colors"
                      >
                        <Phone className="h-3 w-3 text-slate-500" />
                        <span>{cand.telephone}</span>
                      </a>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 leading-normal">
                      <span className="block font-semibold uppercase font-mono text-[9px] text-slate-400">Moyen de promotion :</span>
                      <p className="p-2.5 bg-white border border-slate-200 rounded-xl italic font-serif">
                        "{cand.moyen_promotion}"
                      </p>
                    </div>

                    {cand.lien_audience && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-semibold uppercase text-slate-400 shrink-0">Lien audience :</span>
                        <a
                          href={cand.lien_audience}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:underline font-mono truncate"
                        >
                          <span>{cand.lien_audience}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                      {showRefusInput[cand.id] ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Motif de refus (optionnel, ex : Audience insuffisante)"
                            value={motifRefusText[cand.id] || ""}
                            onChange={(e) => setMotifRefusText({
                              ...motifRefusText,
                              [cand.id]: e.target.value
                            })}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-red-500 text-slate-850"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setShowRefusInput({ ...showRefusInput, [cand.id]: false });
                              }}
                              className="px-3 py-1 bg-slate-150 text-slate-700 font-semibold text-[10px] rounded-lg cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleRejectAffiliate(cand.id)}
                              className="px-3 py-1 bg-rose-600 text-white font-bold text-[10px] rounded-lg cursor-pointer flex items-center gap-1"
                            >
                              <X className="h-3 w-3" />
                              <span>Valider le refus</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setShowRefusInput({ ...showRefusInput, [cand.id]: true });
                            }}
                            className="px-4 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>Refuser</span>
                          </button>
                          <button
                            onClick={() => handleAcceptAffiliate(cand.id)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Accepter l'affilié</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Commission Payout Requests Claims */}
          <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Coins className="h-5 w-5 text-indigo-600" /> Demandes de Retrait de Commissions ({
                adminPayoutRequests.length
              })
            </h3>

            {loadingAdminPayouts ? (
              <p className="text-xs text-slate-500 text-center py-6 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Chargement des demandes de retrait...
              </p>
            ) : adminPayoutRequests.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6 bg-slate-50 border border-slate-100 rounded-xl">
                Aucune demande de retrait de commissions pour l'instant.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-mono font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Affilié / Code unique</th>
                      <th className="py-3 px-4">Date Demande</th>
                      <th className="py-3 px-4 text-right">Montant</th>
                      <th className="py-3 px-4">Téléphone Mobile Money</th>
                      <th className="py-3 px-4 text-center">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {adminPayoutRequests.map((req) => {
                      // Find the affiliate object to get human name/code
                      const matchedAff = affiliates.find(a => a.id === req.affiliate_id);
                      const affiliateName = matchedAff ? matchedAff.nom_complet : "Affilié Inconnu";
                      const referralCode = matchedAff ? matchedAff.referral_code : "-";

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{affiliateName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Code: {referralCode}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-550 font-mono">
                            {new Date(req.requested_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-indigo-600 font-mono text-sm">
                            {req.montant.toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-slate-700 font-bold bg-slate-100 px-2 py-0.5 border border-slate-200 rounded">
                              {req.telephone_paiement}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {req.statut === "paid" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                                <CheckCircle className="h-3 w-3" /> Payé
                              </span>
                            ) : req.statut === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wider">
                                <X className="h-3 w-3" /> Rejeté
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider animate-pulse">
                                <Clock className="h-3 w-3 animate-spin" /> En attente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {req.statut === "pending" && (
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleRejectPayoutRequest(req.id)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                                >
                                  Rejeter
                                </button>
                                <button
                                  onClick={() => handleMarkPayoutAsPaid(req.id)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                                >
                                  Marquer comme payé
                                </button>
                              </div>
                            )}
                            {req.statut !== "pending" && (
                              <span className="text-[10px] text-slate-400 font-mono italic">
                                Traitée le {req.processed_at ? new Date(req.processed_at).toLocaleDateString() : "-"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Active Affiliates & stats */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-4">
              <Users className="h-5 w-5 text-indigo-600" /> Tous les Affiliés Actifs ({
                affiliates.filter(a => a.status === "approved").length
              })
            </h3>

            {affiliates.filter(a => a.status === "approved").length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Aucun affilié actif approuvé pour l'instant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-mono font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Affilié / Contact</th>
                      <th className="py-3 px-4">Code unique</th>
                      <th className="py-3 px-4 text-center">Statut Compte</th>
                      <th className="py-3 px-4 text-right">Ventes directes</th>
                      <th className="py-3 px-4 text-right">Commissions</th>
                      <th className="py-3 px-4 text-center">Filleuls (Réseau)</th>
                      <th className="py-3 px-4 text-center">Messagerie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {affiliates.filter(a => a.status === "approved").map((aff) => (
                      <tr key={aff.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{aff.nom_complet}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{aff.telephone}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">{aff.referral_code}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {aff.activated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span> Activé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full"></span> Non Activé
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {aff.salesCount} ventes
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 font-mono">
                          {aff.commissionsSum.toLocaleString()} FCFA
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600 font-mono">
                          {aff.daughterCount} parrainés
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedChatAffiliate(aff);
                              fetchChatMessages(aff.id);
                            }}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl cursor-pointer transition-all inline-flex items-center gap-1 text-[10px] font-bold"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Contacter</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Interactive Messenger Response Hub */}
          {selectedChatAffiliate && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-md p-6 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">
                    {selectedChatAffiliate.nom_complet.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-900 leading-none">
                      Support avec : {selectedChatAffiliate.nom_complet}
                    </h3>
                    <p className="text-[10px] text-indigo-600 font-mono mt-0.5">Code unique : {selectedChatAffiliate.referral_code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChatAffiliate(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Chat messages viewport */}
              <div className="max-h-[200px] overflow-y-auto space-y-3 py-2 pr-1">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Aucun message historique. Envoyez la première communication ci-dessous.</p>
                ) : (
                  chatMessages.map((m) => {
                    const isAdmin = m.sender === "admin";
                    return (
                      <div
                        key={m.id}
                        className={`flex ${isAdmin ? "justify-end" : "justify-start"} items-end gap-1.5`}
                      >
                        {!isAdmin && (
                          <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0 font-mono">
                            {selectedChatAffiliate.nom_complet.substring(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="max-w-[75%] space-y-0.5">
                          <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                            isAdmin
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : "bg-slate-200 text-slate-800 rounded-bl-none"
                          }`}>
                            {m.message}
                          </div>
                          <span className="block text-[8px] text-slate-400 font-mono px-1">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Reply Form */}
              <form onSubmit={handleSendAdminReply} className="border-t border-slate-100 pt-3 flex gap-2">
                <input
                  type="text"
                  required
                  placeholder={`Répondre à ${selectedChatAffiliate.nom_complet}...`}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 text-slate-850"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !adminReplyText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {sendingReply ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Répondre</span>
                </button>
              </form>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
