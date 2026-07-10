import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { CV } from "../types";
import { FileText, Download, ShieldAlert, ArrowLeft, RefreshCw, Layout, Globe, UserCheck, Lock } from "lucide-react";

interface CVPublicViewProps {
  reference: string;
  onBack?: () => void;
}

export default function CVPublicView({
  reference,
  onBack,
}: CVPublicViewProps) {
  const [cv, setCv] = useState<CV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCV = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) {
        alert("Veuillez vous connecter pour pouvoir télécharger ce CV.");
        const url = new URL(window.location.href);
        url.searchParams.set("trigger_auth", "true");
        window.location.href = url.toString();
        return;
      }

      const token = session.access_token;
      const response = await fetch(`/api/download/cv/${reference}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Impossible de générer le lien de téléchargement sécurisé.");
      }

      const data = await response.json();
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename || `CV_${reference}.pdf`;
      link.target = "_blank";
      link.referrerPolicy = "no-referrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Error downloading CV:", err);
      alert(err.message || "Une erreur est survenue lors du téléchargement.");
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const fetchPublicCV = async () => {
      if (!supabase) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from("cvs")
          .select("*")
          .eq("reference", reference)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!data) {
          setError("Curriculum Vitae introuvable.");
          return;
        }

        // If the CV is set to private, do not show it
        if (data.visibility === "private") {
          setError("Ce Curriculum Vitae est privé ou l'auteur a restreint son accès public.");
          return;
        }

        setCv(data);
      } catch (err: any) {
        console.error("Error loading public CV:", err);
        setError("Erreur technique lors de la récupération du CV.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCV();
  }, [reference]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-sans">
        <RefreshCw className="h-10 w-10 text-indigo-650 animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-semibold mt-4">Chargement du profil professionnel...</p>
      </div>
    );
  }

  if (error || !cv) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center font-sans space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl inline-block border border-rose-100">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Accès non autorisé ou inexistant</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          {error || "Ce Curriculum Vitae n'est plus disponible ou a été déplacé."}
        </p>
        <div className="pt-4">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retourner à l'accueil</span>
            </button>
          ) : (
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retourner à la boutique</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  const { data, summary, pdf_url, visibility } = cv;
  const { nom, titre, photo, competences, experiences, formation } = data;

  const displayName = visibility === "anonymous" ? (nom ? nom.split(" ")[0] + " (Profil Anonyme)" : "Professionnel de la Tech") : (nom || "Nom Candidat");

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
      {/* Action banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
            <Layout className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold">Curriculum Vitae Certifié</h3>
            <p className="text-[10px] text-slate-400 font-mono">ID: {reference}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Quitter la vue
            </button>
          )}
          {pdf_url && (
            <button
              onClick={handleDownloadCV}
              disabled={downloading}
              className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-all shadow-md hover:shadow flex items-center gap-1.5 cursor-pointer"
            >
              {downloading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{downloading ? "Génération..." : "Télécharger le PDF officiel"}</span>
            </button>
          )}
        </div>
      </div>

      {/* CV Rendering stage */}
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-14 max-w-[700px] mx-auto text-slate-900 space-y-8 selection:bg-indigo-50 selection:text-indigo-900">
        {/* Profile info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-2 border-slate-900 pb-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-slate-900">
              {displayName}
            </h1>
            <h2 className="text-sm sm:text-base font-bold text-indigo-650 uppercase tracking-wide">
              {titre || "Poste visé"}
            </h2>
          </div>
          {photo ? (
            <img
              src={photo}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-slate-200 shrink-0 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
              }}
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center font-black text-2xl uppercase shrink-0">
              {(nom || "V").charAt(0)}
            </div>
          )}
        </div>

        {/* Hook summary */}
        {summary && (
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-indigo-650 tracking-widest font-mono">
              Profil / Accroche
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed text-justify">
              {summary}
            </p>
          </div>
        )}

        {/* Skills */}
        {competences && competences.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase text-indigo-650 tracking-widest font-mono">
              Compétences clés
            </h3>
            <div className="flex flex-wrap gap-2">
              {competences.map((comp, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-50 text-slate-800 text-xs font-bold border border-slate-100 rounded-md"
                >
                  {comp}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experiences */}
        {experiences && experiences.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-indigo-650 tracking-widest font-mono">
              Expériences professionnelles
            </h3>
            <div className="space-y-5">
              {experiences.map((exp, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
                      {exp.poste}
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {exp.date_debut} - {exp.date_fin}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-indigo-600/90">{exp.entreprise}</p>
                  {exp.description && (
                    <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Educations */}
        {formation && formation.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-indigo-650 tracking-widest font-mono">
              Formation académique
            </h3>
            <div className="space-y-3">
              {formation.map((form, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900">{form.diplome}</h4>
                    <p className="text-slate-500">{form.ecole}</p>
                  </div>
                  <span className="font-bold text-slate-400 font-mono">{form.annee}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
