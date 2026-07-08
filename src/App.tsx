import React, { useState, useEffect } from "react";
import { CreditCard, Phone, Shield, ShoppingBag, X, AlertTriangle, RefreshCw, KeyRound, CheckCircle2 } from "lucide-react";
import Header from "./components/Header";
import EbookCard from "./components/EbookCard";
import BookDetailModal from "./components/BookDetailModal";
import AuthModal from "./components/AuthModal";
import AdminPanel from "./components/AdminPanel";
import PurchaseList from "./components/PurchaseList";
import { Ebook, Achat, PaymentStatus } from "./types";
import { hasSupabaseKeys, supabase } from "./supabaseClient";

export default function App() {
  // Navigation & Views
  const [currentView, setView] = useState<string>("catalog"); // catalog, my-purchases, admin
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedEbook, setSelectedEbook] = useState<Ebook | null>(null);

  // Users & Auth States
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<string>("user"); // user | admin

  // Catalogs & Transactions
  const [ebooks, setEbooks] = useState<Ebook[]>([]);
  const [purchases, setPurchases] = useState<Achat[]>([]);
  const [loadingEbooks, setLoadingEbooks] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Payment checkout form state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutEbook, setCheckoutEbook] = useState<Ebook | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [clientNameInput, setClientNameInput] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Downloading State
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Diagnostic Config Status Overview
  const [configStatus, setConfigStatus] = useState<{
    isRealProduction: boolean;
    supabaseUrl: string;
    moneyfusionUrl: string;
    supabaseServiceKey: string;
    missingServerVars: string[];
  }>({
    isRealProduction: false,
    supabaseUrl: "Chargement...",
    moneyfusionUrl: "Chargement...",
    supabaseServiceKey: "Chargement...",
    missingServerVars: [],
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 1. Load Initial Configuration Status & Ebooks
  useEffect(() => {
    fetchConfigStatus();
    fetchEbooks();
  }, []);

  // 2. Auth State Sync with real Supabase
  useEffect(() => {
    if (hasSupabaseKeys && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! });
          fetchUserProfileAndData(session.user.id, session.access_token);
        } else {
          setUser(null);
          setRole("user");
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! });
          fetchUserProfileAndData(session.user.id, session.access_token);
        } else {
          setUser(null);
          setRole("user");
          setPurchases([]);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [currentView]);

  const fetchConfigStatus = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/api/config-status");
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error("Failed to fetch config status from backend:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchEbooks = async () => {
    setLoadingEbooks(true);
    setDbError(null);
    try {
      const res = await fetch("/api/ebooks");
      if (res.ok) {
        const data = await res.json();
        setEbooks(data);
      } else {
        const errData = await res.json();
        setDbError(errData.error || "Une erreur est survenue lors de la récupération des ebooks.");
      }
    } catch (err: any) {
      console.error("Error loading ebooks:", err);
      setDbError(err.message || "Erreur réseau de communication avec le serveur.");
    } finally {
      setLoadingEbooks(false);
    }
  };

  // Fetch real User Profile and Purchases via backend
  const fetchUserProfileAndData = async (userId: string, token: string) => {
    try {
      const res = await fetch("/api/user-data", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRole(data.role);
        setPurchases(data.purchases);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  // Admin: Add Ebook
  const handleAddEbook = async (ebookData: Omit<Ebook, "id">): Promise<boolean> => {
    try {
      const res = await fetch("/api/ebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ebookData),
      });
      if (res.ok) {
        await fetchEbooks();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to add ebook:", err);
      return false;
    }
  };

  // Admin: Delete Ebook
  const handleDeleteEbook = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/ebooks/" + id, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchEbooks();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to delete ebook:", err);
      return false;
    }
  };

  // Auth Success Handler
  const handleLoginSuccess = (userData: { id: string; email: string }, userRole: string) => {
    setUser(userData);
    setRole(userRole);
    setAuthModalOpen(false);
  };

  // Logout Handler
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRole("user");
    setPurchases([]);
    setView("catalog");
  };

  // Initiate MoneyFusion Payment Flow
  const handleOpenCheckout = (ebook: Ebook) => {
    setCheckoutEbook(ebook);
    setPhoneInput("");
    setClientNameInput(user?.email.split("@")[0] || "Client");
    setPurchaseError(null);
    setCheckoutModalOpen(true);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutEbook || !user) return;

    setIsPurchasing(true);
    setPurchaseError(null);

    let authToken = "";
    if (supabase) {
      const session = (await supabase.auth.getSession()).data.session;
      authToken = session?.access_token || "";
    }

    try {
      const payload = {
        ebookId: checkoutEbook.id,
        userId: user.id,
        numeroSend: phoneInput,
        nomclient: clientNameInput,
        userEmail: user.email,
      };

      console.log("Requesting payment session creation...", payload);
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.statut) {
        setCheckoutModalOpen(false);
        setSelectedEbook(null); // close detail modal if open
        // Redirect client to MoneyFusion secure production checkout page
        window.location.href = data.url;
      } else {
        setPurchaseError(data.error || "Une erreur s'est produite lors de l'initialisation du paiement MoneyFusion.");
      }
    } catch (err: any) {
      setPurchaseError("Erreur réseau ou serveur : " + err.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Secure Signed Downloader Trigger
  const handleDownloadEbook = async (ebookId: string) => {
    setDownloadingId(ebookId);
    let authToken = "";

    if (supabase) {
      const session = (await supabase.auth.getSession()).data.session;
      authToken = session?.access_token || "";
    }

    try {
      const res = await fetch(`/api/download/${ebookId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Received signed download URL:", data);

        const link = document.createElement("a");
        link.href = data.url;
        link.download = data.filename || "ebook.pdf";
        link.target = "_blank";
        link.referrerPolicy = "no-referrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const errData = await res.json();
        alert(errData.error || "Impossible de télécharger le document.");
      }
    } catch (err) {
      alert("Erreur réseau lors de la génération de l'URL sécurisée.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Manual Check Status for Webhook Synchronization
  const handleRefreshPurchaseStatus = async (token: string) => {
    try {
      const res = await fetch(`/api/payments/status/${token}`);
      if (res.ok) {
        const updatedPurchase = await res.json();

        // Refresh list
        if (supabase) {
          const session = (await supabase.auth.getSession()).data.session;
          if (session) fetchUserProfileAndData(user!.id, session.access_token);
        }

        if (updatedPurchase.statut === PaymentStatus.PAID) {
          alert(`🎉 Paiement validé avec succès pour l'ebook "${updatedPurchase.ebook?.titre}" ! Votre fichier PDF est débloqué.`);
        } else if (updatedPurchase.statut === PaymentStatus.FAILURE) {
          alert("❌ Le paiement semble avoir été annulé ou a échoué.");
        } else {
          alert("⏳ Le paiement est toujours en cours de validation chez MoneyFusion. Veuillez patienter un instant puis réessayer.");
        }
      }
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  // Determine if there are missing environment variables
  const missingClientVars: string[] = [];
  const clientSupUrl = (import.meta as any).env.VITE_SUPABASE_URL;
  const clientSupKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

  if (!clientSupUrl) missingClientVars.push("VITE_SUPABASE_URL (Client)");
  if (!clientSupKey) missingClientVars.push("VITE_SUPABASE_ANON_KEY (Client)");

  const isConfigError = missingClientVars.length > 0 || configStatus.missingServerVars?.length > 0;

  // ==========================================
  // CONFIGURATION ERROR RENDER INTERFACE (FAIL-CLOSED)
  // ==========================================
  if (isConfigError && !loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans select-none">
        <div className="max-w-xl w-full bg-slate-950/80 border border-red-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8 animate-in fade-in duration-500">
          
          {/* Accent decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-red-600/10 blur-3xl rounded-full"></div>
          
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
            <div className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight text-white leading-none">
                Erreur de Configuration
              </h1>
              <p className="text-xs text-red-400 mt-1.5 font-medium">Production Uniquement - Mode Simulateur Désactivé</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Pour des raisons de sécurité, cette boutique d'ebooks fonctionne exclusivement en mode réel avec de vraies clés. Le système a détecté des variables d'environnement manquantes qui empêchent son démarrage.
            </p>

            {/* Error Message Details */}
            <div className="space-y-3.5 pt-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Variables d'environnement requises manquantes :
              </span>
              
              <div className="space-y-2.5">
                {/* Client keys check */}
                {missingClientVars.map((v) => (
                  <div key={v} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-xs text-red-300 font-mono">
                    <KeyRound className="h-4 w-4 shrink-0 text-red-500" />
                    <span>Configuration manquante : {v} n'est pas définie</span>
                  </div>
                ))}

                {/* Server keys check */}
                {configStatus.missingServerVars?.map((v) => (
                  <div key={v} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3 text-xs text-red-300 font-mono">
                    <KeyRound className="h-4 w-4 shrink-0 text-red-500" />
                    <span>Configuration manquante : {v} n'est pas définie</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guidelines on how to fix */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-2 text-xs text-slate-400 leading-relaxed">
            <p className="font-bold text-slate-200">Comment résoudre ce problème ?</p>
            <p>
              Veuillez définir l'ensemble de ces clés dans votre panneau de configuration d'hébergement ou votre fichier d'environnement local. Les variables attendues sont détaillées dans le fichier <code className="text-indigo-400 font-mono">.env.example</code>.
            </p>
          </div>

          {/* Retry Button */}
          <button
            onClick={() => {
              fetchConfigStatus();
              fetchEbooks();
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Vérifier à nouveau</span>
          </button>
        </div>
      </div>
    );
  }

  // Categories list
  const categories = ["all", ...new Set(ebooks.map((eb) => eb.categorie))].filter((cat) => cat !== "all") as string[];

  // Filtering catalogue
  const filteredEbooks = ebooks.filter((eb) => {
    const matchesSearch =
      eb.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eb.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eb.categorie.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || eb.categorie === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-between" id="app-root">
      {/* Navigation Header */}
      <Header
        currentView={currentView}
        setView={setView}
        user={user}
        role={role}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* CATALOG VIEW */}
        {currentView === "catalog" && (
          <div className="space-y-8" id="catalog-view">
            {/* Hero / Banner section */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-indigo-950/30 relative overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="space-y-4 max-w-xl text-center sm:text-left relative z-10">
                <span className="bg-indigo-500/10 backdrop-blur-md text-indigo-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-500/20 font-mono">
                  🚀 NOURRISSEZ VOTRE INTELLIGENCE
                </span>
                <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-none">
                  Les Meilleurs Ebooks de Développement en Afrique
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
                  Téléchargement de PDF haute-qualité sécurisé et automatisé. Payez instantanément par <strong>Orange Money, MTN MoMo, Moov ou Wave</strong>.
                </p>
              </div>

              {/* Vector Icon graphic on the right */}
              <div className="shrink-0 p-4 bg-indigo-500/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl hidden lg:block rotate-3 hover:rotate-0 transition-transform duration-300">
                <ShoppingBag className="h-16 w-16 text-indigo-400" />
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-display font-bold text-lg text-slate-900 tracking-tight">
                  Toutes nos oeuvres disponibles ({filteredEbooks.length})
                </h3>
              </div>

              {dbError ? (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 sm:p-10 space-y-6 max-w-3xl mx-auto shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20 shrink-0">
                      <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-display font-black text-lg text-amber-900 leading-tight">
                        Schéma de la base de données non détecté
                      </h4>
                      <p className="text-xs sm:text-sm text-amber-850 leading-relaxed">
                        Le serveur est correctement connecté à votre projet Supabase, mais la table <code className="bg-amber-100/80 px-1.5 py-0.5 rounded text-amber-950 font-mono text-xs font-bold">ebooks</code> n'a pas été trouvée. Vous devez initialiser votre base de données en exécutant le script SQL d'initialisation.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                        Script d'initialisation SQL à copier
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`-- 1. Create Profile Roles type\nCREATE TYPE user_role AS ENUM ('user', 'admin');\n\n-- 2. Create Profiles Table (Linked to auth.users)\nCREATE TABLE public.profiles (\n  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,\n  role user_role NOT NULL DEFAULT 'user'::user_role,\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())\n);\n\n-- 3. Create Ebooks Table\nCREATE TABLE public.ebooks (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  titre TEXT NOT NULL,\n  description TEXT NOT NULL,\n  prix NUMERIC NOT NULL CHECK (prix >= 0),\n  url_couverture TEXT NOT NULL,\n  url_fichier_storage TEXT NOT NULL,\n  categorie TEXT NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\n-- 4. Create Achats (Purchases) Table\nCREATE TABLE public.achats (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,\n  ebook_id UUID REFERENCES public.ebooks ON DELETE CASCADE NOT NULL,\n  token_pay TEXT UNIQUE NOT NULL,\n  statut TEXT NOT NULL DEFAULT 'pending',\n  montant NUMERIC NOT NULL,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL\n);\n\n-- Enable Row Level Security\nALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;\nALTER TABLE public.achats ENABLE ROW LEVEL SECURITY;\n\n-- Policies\nCREATE POLICY "Anyone can view ebooks" ON public.ebooks FOR SELECT USING (true);\nCREATE POLICY "Users can view their own purchases" ON public.achats FOR SELECT USING (auth.uid() = user_id);\nCREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);`);
                          alert("Le script SQL d'initialisation a été copié dans votre presse-papiers !");
                        }}
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-350 transition-colors cursor-pointer"
                      >
                        Copier le script SQL
                      </button>
                    </div>
                    
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      1. Connectez-vous à votre dashboard <strong>Supabase</strong>.<br />
                      2. Allez dans l'onglet <strong>SQL Editor</strong> dans le menu de gauche.<br />
                      3. Cliquez sur <strong>New query</strong>.<br />
                      4. Collez le script d'initialisation fourni dans le fichier <code className="text-indigo-400 font-mono text-[11px]">supabase_schema.sql</code> de ce projet.<br />
                      5. Cliquez sur <strong>Run</strong> pour exécuter le script, puis rafraîchissez cette page.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => fetchEbooks()}
                      className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Réessayer la connexion</span>
                    </button>
                  </div>
                </div>
              ) : loadingEbooks ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-500 font-mono">Interrogation de la base de données...</span>
                </div>
              ) : filteredEbooks.length === 0 ? (
                <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
                  <p className="text-sm text-slate-500">Aucun ebook ne correspond à votre recherche ou catégorie.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {filteredEbooks.map((ebook) => {
                    const hasPurchased = purchases.some(
                      (p) => p.ebook_id === ebook.id && p.statut === PaymentStatus.PAID
                    );
                    return (
                      <EbookCard
                        key={ebook.id}
                        ebook={ebook}
                        onSelect={setSelectedEbook}
                        onBuy={handleOpenCheckout}
                        hasPurchased={hasPurchased}
                        isPurchasing={isPurchasing}
                        user={user}
                        onOpenAuth={() => setAuthModalOpen(true)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY PURCHASES VIEW */}
        {currentView === "my-purchases" && (
          <PurchaseList
            purchases={purchases}
            onDownload={handleDownloadEbook}
            downloadingId={downloadingId}
            onRefreshStatus={handleRefreshPurchaseStatus}
            setView={setView}
          />
        )}

        {/* ADMIN BACK-OFFICE VIEW */}
        {currentView === "admin" && (
          <AdminPanel
            ebooks={ebooks}
            onAddEbook={handleAddEbook}
            onDeleteEbook={handleDeleteEbook}
            configStatus={configStatus}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono tracking-wide mt-12 shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>&copy; 2026 EbookStore Africa. Tous droits réservés.</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-indigo-600" /> Sécurisé par Supabase & Cloudflare</span>
          </div>
        </div>
      </footer>

      {/* --- MODALS --- */}

      {/* 1. Auth Login/Register Modal */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 2. Book Detailed Preview Modal */}
      {selectedEbook && (
        <BookDetailModal
          ebook={selectedEbook}
          onClose={() => setSelectedEbook(null)}
          onBuy={handleOpenCheckout}
          hasPurchased={purchases.some(
            (p) => p.ebook_id === selectedEbook.id && p.statut === PaymentStatus.PAID
          )}
          isPurchasing={isPurchasing}
          user={user}
          onOpenAuth={() => setAuthModalOpen(true)}
          onDownload={handleDownloadEbook}
          downloadingId={downloadingId}
        />
      )}

      {/* 3. Checkout Information Input Modal */}
      {checkoutModalOpen && checkoutEbook && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-sans" id="checkout-input-modal">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCheckoutModalOpen(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left shadow-2xl transition-all w-full max-w-sm border border-slate-200 space-y-6 animate-in fade-in zoom-in-95 duration-200">
              
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="absolute right-4 top-4 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center space-y-1">
                <h3 className="font-display font-black text-lg text-slate-900">Coordonnées Mobile Money</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Saisissez les informations de facturation pour lancer la demande de paiement MoneyFusion.
                </p>
              </div>

              {purchaseError && (
                <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-xl border border-rose-100 font-mono">
                  {purchaseError}
                </div>
              )}

              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">
                    Nom Complet du Client
                  </label>
                  <input
                    type="text"
                    required
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    placeholder="Ex: John Doe"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mb-1">
                    Numéro de Téléphone Payeur *
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="Ex: 07070707"
                      className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Numéro utilisé pour débiter votre mobile money (Orange, MTN, Wave).
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 flex justify-between items-center">
                  <span>Montant de la transaction :</span>
                  <strong className="font-bold text-slate-900">{checkoutEbook.prix.toLocaleString()} FCFA</strong>
                </div>

                <button
                  type="submit"
                  disabled={isPurchasing}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-100 disabled:text-slate-400 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow hover:shadow-md flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="h-4.5 w-4.5" />
                  <span>{isPurchasing ? "Lancement en cours..." : "Lancer le paiement"}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
