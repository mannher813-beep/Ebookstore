import React, { useState, useEffect } from "react";
import { Plus, Trash2, Database, ShieldCheck, DollarSign, ListOrdered, Code, ArrowUpRight, HelpCircle, FileText } from "lucide-react";
import { Ebook, Achat } from "../types";

interface AdminPanelProps {
  ebooks: Ebook[];
  onAddEbook: (ebook: Omit<Ebook, "id">) => Promise<boolean>;
  onDeleteEbook: (id: string) => Promise<boolean>;
  configStatus: any;
}

export default function AdminPanel({ ebooks, onAddEbook, onDeleteEbook, configStatus }: AdminPanelProps) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [prix, setPrix] = useState("");
  const [urlCouverture, setUrlCouverture] = useState("");
  const [urlFichier, setUrlFichier] = useState("");
  const [categorie, setCategorie] = useState("Programmation");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  // Fetch transaction history
  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const token = localStorage.getItem("simulated_user")
        ? JSON.parse(localStorage.getItem("simulated_user")!).role === "admin" ? "mock-token-admin" : "mock-token-user"
        : "Bearer " + (await import("../supabaseClient")).supabase?.auth.getSession(); // simplified

      const res = await fetch("/api/transactions", {
        headers: {
          "Authorization": token || "mock-token-admin"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    if (!titre || !description || !prix || !urlCouverture || !urlFichier || !categorie) {
      setError("Veuillez remplir tous les champs requis.");
      setLoading(false);
      return;
    }

    const added = await onAddEbook({
      titre,
      description,
      prix: Number(prix),
      url_couverture: urlCouverture,
      url_fichier_storage: urlFichier,
      categorie,
    });

    if (added) {
      setSuccess(true);
      setTitre("");
      setDescription("");
      setPrix("");
      setUrlCouverture("");
      setUrlFichier("");
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError("Échec de la création de l'ebook.");
    }
    setLoading(false);
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

  // Pre-fill fields for easy testing/demo
  const handlePreFill = () => {
    setTitre("Maîtriser Next.js 16 et Supabase v3");
    setDescription("Un livre exhaustif pour de futures applications résilientes, avec paiements Stripe et webhooks de bout-en-bout.");
    setPrix("6500");
    setUrlCouverture("https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&q=80&w=400");
    setUrlFichier("nextjs_supabase_book.pdf");
    setCategorie("Programmation");
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

      {/* Grid: Forms & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" /> Ajouter un Ebook
            </h3>
            <button
              onClick={handlePreFill}
              className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer border border-indigo-150"
            >
              Pré-remplir la Démo
            </button>
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

              <div>
                <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1.5">Couverture (Image URL) *</label>
                <input
                  type="url"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={urlCouverture}
                  onChange={(e) => setUrlCouverture(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider font-mono mb-1.5">Fichier PDF dans le Storage (Chemin complet) *</label>
              <input
                type="text"
                required
                placeholder="Ex : guide_marketing_afrique.pdf"
                value={urlFichier}
                onChange={(e) => setUrlFichier(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1.5 block leading-normal">
                Ce fichier doit résider dans votre bucket privé Supabase Storage <strong>"ebooks-fichiers"</strong>.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow hover:shadow-md"
            >
              {loading ? "Création en cours..." : "Enregistrer l'Ebook"}
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
                <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[9px] ${
                  configStatus.isRealProduction
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                }`}>
                  {configStatus.isRealProduction ? "PRODUCTION" : "SIMULATEUR"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-sans">Endpoint Supabase</span>
                  <span className="text-slate-400 font-mono text-[10px]">SUPABASE_URL</span>
                </div>
                <span className="block p-1.5 bg-slate-50 rounded-lg text-[10px] font-mono border border-slate-200 text-slate-600 truncate max-w-full">
                  {configStatus.supabaseUrl}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-sans">Service Role Access</span>
                  <span className="text-slate-400 font-mono text-[10px]">SUPABASE_SERVICE_KEY</span>
                </div>
                <span className={`block p-1.5 rounded-lg text-[10px] font-mono border text-center ${
                  configStatus.supabaseServiceKey.includes("Configuré")
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800 font-bold"
                    : "bg-rose-50 border-rose-100 text-rose-800"
                }`}>
                  {configStatus.supabaseServiceKey}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium font-sans">MoneyFusion Payment API</span>
                  <span className="text-slate-400 font-mono text-[10px]">MONEYFUSION_URL</span>
                </div>
                <span className="block p-1.5 bg-slate-50 rounded-lg text-[10px] font-mono border border-slate-200 text-slate-600 truncate max-w-full">
                  {configStatus.moneyfusionUrl}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Manual / Deploy guidelines */}
          <div className="bg-indigo-50/70 border border-indigo-100/60 rounded-2xl p-6 shadow-sm space-y-3.5">
            <h3 className="font-display font-bold text-sm text-indigo-900 flex items-center gap-1.5">
              <Code className="h-4 w-4" /> Manuel de Déploiement
            </h3>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Pour connecter vos comptes réels et déployer en production sur <strong>Cloudflare / Cloud Run</strong>, configurez les variables d'environnement suivantes dans votre panneau de contrôle :
            </p>
            <ul className="space-y-2 text-xs font-mono text-indigo-900">
              <li>1. <strong className="font-sans text-slate-800 font-bold">VITE_SUPABASE_URL</strong> : URL projet</li>
              <li>2. <strong className="font-sans text-slate-800 font-bold">VITE_SUPABASE_ANON_KEY</strong> : Clé publique</li>
              <li>3. <strong className="font-sans text-slate-800 font-bold">SUPABASE_SERVICE_ROLE_KEY</strong> : Clé de bypass</li>
              <li>4. <strong className="font-sans text-slate-800 font-bold">MONEYFUSION_API_URL</strong> : Endpoint MoneyFusion</li>
            </ul>
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
    </div>
  );
}
