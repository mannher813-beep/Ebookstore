import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { ArrowLeft, Code, Globe, Plus, Trash2, Check, Copy, HelpCircle, ShieldAlert, RefreshCw } from "lucide-react";

interface AuthorizedDomain {
  id: string;
  user_id: string;
  domain: string;
  api_key?: string;
  created_at?: string;
}

interface InstallConnectorViewProps {
  user: any;
  onBack: () => void;
}

export default function InstallConnectorView({
  user,
  onBack,
}: InstallConnectorViewProps) {
  const [domainInput, setDomainInput] = useState("");
  const [domains, setDomains] = useState<AuthorizedDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userRef, setUserRef] = useState<string>("CV-2026-XXXX");
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [copiedWidget, setCopiedWidget] = useState(false);

  // Fetch registered domains and user's primary CV reference
  const loadData = async () => {
    if (!supabase || !user) return;
    setFetching(true);
    try {
      // 1. Load CVs to get a real reference if available
      const { data: cvs } = await supabase
        .from("cvs")
        .select("reference")
        .eq("user_id", user.id)
        .limit(1);
      
      if (cvs && cvs.length > 0) {
        setUserRef(cvs[0].reference);
      }

      // 2. Load authorized connectors
      // We do a soft query supporting both 'cv_connectors' and 'cv-connectors'
      let tableToUse = "cv_connectors";
      const { data, error } = await supabase
        .from(tableToUse)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback to cv-connectors if underscore table doesn't exist
        tableToUse = "cv-connectors";
        const { data: fbData, error: fbErr } = await supabase
          .from(tableToUse)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (!fbErr) {
          setDomains(fbData || []);
        } else {
          console.error("Failed to fetch domains from both schemas:", fbErr);
        }
      } else {
        setDomains(data || []);
      }
    } catch (err) {
      console.error("Error fetching connector domains:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRegisterDomain = async () => {
    if (!supabase || !user) return;
    let url = domainInput.trim().toLowerCase();
    if (!url) return;

    // Clean URL: extract host name only (e.g. https://myportfolio.com -> myportfolio.com)
    try {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      const parsed = new URL(url);
      url = parsed.hostname;
    } catch {
      // If parsing fails, fall back to regex or keep input
      url = url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    }

    if (!url) {
      alert("Format de domaine invalide.");
      return;
    }

    setLoading(true);
    try {
      const generatedKey = `sec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const payload = {
        user_id: user.id,
        domain: url,
        api_key: generatedKey,
      };

      // Try inserting into cv_connectors, fallback to cv-connectors if it fails
      let { error } = await supabase.from("cv_connectors").insert(payload);
      
      if (error) {
        const { error: fbErr } = await supabase.from("cv-connectors").insert(payload);
        if (fbErr) throw fbErr;
      }

      setDomainInput("");
      loadData();
    } catch (err: any) {
      console.error("Error registering domain:", err);
      alert("Échec de l'enregistrement du domaine : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!supabase || !confirm("Êtes-vous sûr de vouloir révoquer l'accès pour ce domaine ?")) return;
    try {
      let { error } = await supabase.from("cv_connectors").delete().eq("id", id);
      if (error) {
        const { error: fbErr } = await supabase.from("cv-connectors").delete().eq("id", id);
        if (fbErr) throw fbErr;
      }
      setDomains(domains.filter((d) => d.id !== id));
    } catch (err: any) {
      alert("Échec de la suppression : " + err.message);
    }
  };

  const iframeSnippet = `<iframe 
  src="${window.location.origin}/cv/${userRef}" 
  width="100%" 
  height="750px" 
  style="border: 2px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);"
></iframe>`;

  const widgetSnippet = `<!-- EbookStore Widget Mount point -->
<div id="ebookstore-cv-widget" data-ref="${userRef}"></div>

<!-- EbookStore Widget Script -->
<script>
  (function() {
    var ref = "${userRef}";
    var iframe = document.createElement("iframe");
    iframe.src = "${window.location.origin}/cv/" + ref;
    iframe.style.width = "100%";
    iframe.style.height = "750px";
    iframe.style.border = "none";
    iframe.style.borderRadius = "16px";
    document.getElementById("ebookstore-cv-widget").appendChild(iframe);
  })();
</script>`;

  const copyToClipboard = (text: string, type: "iframe" | "widget") => {
    navigator.clipboard.writeText(text);
    if (type === "iframe") {
      setCopiedIframe(true);
      setTimeout(() => setCopiedIframe(false), 2000);
    } else {
      setCopiedWidget(true);
      setTimeout(() => setCopiedWidget(false), 2000);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500 hover:text-slate-900 border border-slate-200/50 shadow-xs"
          title="Retour au Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-display font-black text-xl text-slate-900">
            Intégration du Connecteur Portfolio
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Affichez vos CV & Bios directement sur votre propre site web
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Domain Whitelist / Keys */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
              Enregistrer mon site web
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pour des raisons de sécurité, nous filtrons l'affichage externe. Seuls les sites web enregistrés ci-dessous seront autorisés à afficher votre widget public.
            </p>

            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="Ex: mon-portfolio.com"
                  className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-xs font-mono text-slate-700"
                />
                <button
                  onClick={handleRegisterDomain}
                  disabled={loading || !domainInput.trim()}
                  className="px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1 shrink-0"
                >
                  {loading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  <span>Ajouter</span>
                </button>
              </div>
            </div>
          </section>

          {/* List of Whitelisted domains */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Domaines Autorisés
            </h3>

            {fetching ? (
              <div className="text-center py-6">
                <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin mx-auto" />
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic text-xs">
                Aucun site web enregistré pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {domains.map((domain) => (
                  <div
                    key={domain.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-150 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="leading-tight">
                        <p className="text-xs font-mono font-bold text-slate-800">{domain.domain}</p>
                        <p className="text-[9px] text-slate-400 font-mono select-all">Clé : {domain.api_key ? domain.api_key.substring(0, 10) + "..." : "Disponible"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDomain(domain.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                      title="Révoquer l'accès"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Copy/Paste Snippet instructions */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                Option 1 : Intégration Iframe Standard
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                La méthode la plus rapide et la plus fiable pour intégrer votre CV. Copiez ce code et collez-le dans le HTML de votre page web.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] leading-relaxed overflow-x-auto select-all">
                {iframeSnippet}
              </pre>
              <button
                onClick={() => copyToClipboard(iframeSnippet, "iframe")}
                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold"
              >
                {copiedIframe ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                Option 2 : Montage de Widget JavaScript
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Utilisez cette option si vous préférez injecter dynamiquement l'Iframe à l'aide d'une balise div et d'un script d'amorçage.
              </p>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] leading-relaxed overflow-x-auto select-all">
                {widgetSnippet}
              </pre>
              <button
                onClick={() => copyToClipboard(widgetSnippet, "widget")}
                className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg cursor-pointer transition-all flex items-center gap-1 text-xs font-semibold"
              >
                {copiedWidget ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-400">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
