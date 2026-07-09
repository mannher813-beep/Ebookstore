import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Bio } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { UserCheck, ShieldAlert, ArrowLeft, RefreshCw, Globe } from "lucide-react";

interface BioPublicViewProps {
  slug: string;
  onBack?: () => void;
}

export default function BioPublicView({
  slug,
  onBack,
}: BioPublicViewProps) {
  const [bio, setBio] = useState<Bio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicBio = async () => {
      if (!supabase) return;
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchErr } = await supabase
          .from("bios")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!data) {
          setError("Biographie introuvable.");
          return;
        }

        // If the Bio is not public, do not show it
        if (!data.is_public) {
          setError("Cette biographie est confidentielle ou l'auteur a désactivé son partage public.");
          return;
        }

        setBio(data);
      } catch (err: any) {
        console.error("Error loading public bio:", err);
        setError("Erreur technique lors du chargement de la biographie.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicBio();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-sans">
        <RefreshCw className="h-10 w-10 text-indigo-650 animate-spin mx-auto" />
        <p className="text-slate-500 text-sm font-semibold mt-4">Chargement de la biographie...</p>
      </div>
    );
  }

  if (error || !bio) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center font-sans space-y-4">
        <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl inline-block border border-rose-100">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Accès restreint ou introuvable</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          {error || "Cette biographie n'est plus accessible ou n'existe pas."}
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

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-8">
      {/* Action header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-slate-800">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold">Biographie Partagée</h3>
            <p className="text-[10px] text-slate-400 font-mono">/bio/{bio.slug}</p>
          </div>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Quitter la vue
          </button>
        )}
      </div>

      {/* Render Markdown container */}
      <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 md:p-14 text-slate-900 selection:bg-indigo-50 selection:text-indigo-900">
        <div className="max-w-2xl mx-auto">
          <MarkdownRenderer content={bio.content} />
        </div>
      </div>
    </main>
  );
}
