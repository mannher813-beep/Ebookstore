import React, { useState } from "react";
import { Bio } from "../types";
import { supabase } from "../supabaseClient";
import { MarkdownRenderer } from "./MarkdownRenderer"; // We'll create this next
import { ArrowLeft, Save, RefreshCw, Eye, Globe, Lock, HelpCircle } from "lucide-react";

interface BioEditorViewProps {
  bio: Bio;
  onBack: () => void;
  onSave: (updatedBio: Bio) => void;
}

export default function BioEditorView({
  bio,
  onBack,
  onSave,
}: BioEditorViewProps) {
  const [slug, setSlug] = useState(bio.slug || "");
  const [content, setContent] = useState(bio.content || "");
  const [isPublic, setIsPublic] = useState(bio.is_public || false);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  // Simple client slug sanitization to keep URLs neat
  const handleSlugChange = (val: string) => {
    const sanitized = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setSlug(sanitized);
    setSlugError(null);
  };

  const handleSave = async () => {
    if (!supabase) return;
    if (!slug.trim()) {
      setSlugError("Le slug d'adresse ne peut pas être vide.");
      return;
    }
    setSaving(true);
    setSlugError(null);
    try {
      // Check if slug is unique (excluding current bio)
      const { data: existing, error: checkErr } = await supabase
        .from("bios")
        .select("id")
        .eq("slug", slug)
        .neq("id", bio.id)
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (existing) {
        setSlugError("Cette adresse de biographie est déjà prise. Veuillez en choisir une autre.");
        setSaving(false);
        return;
      }

      const { data: savedBio, error: saveErr } = await supabase
        .from("bios")
        .update({
          slug,
          content,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bio.id)
        .select()
        .single();

      if (saveErr) throw saveErr;
      onSave(savedBio);
    } catch (err: any) {
      console.error("Error saving bio:", err);
      alert("Échec de la sauvegarde : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans space-y-6">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all cursor-pointer text-slate-500 hover:text-slate-900 border border-slate-200/50 shadow-xs"
            title="Retour au Dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="font-display font-black text-xl text-slate-900">
              Édition de Biographie
            </h2>
            <p className="text-xs text-slate-400 font-semibold font-mono">
              ADRESSE PUBLIQUE : /bio/{slug || "..."}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg self-end sm:self-auto"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Enregistrer les modifications</span>
        </button>
      </div>

      {/* Editor Content split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Form Controls */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section 1: Address slug */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
              Adresse de votre biographie
            </h3>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Slug URL unique
              </label>
              <div className="flex rounded-xl shadow-xs overflow-hidden">
                <span className="inline-flex items-center px-3 bg-slate-100 border border-r-0 border-slate-200 text-slate-400 text-xs font-mono select-none">
                  /bio/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="nom-prenom-123"
                  className="flex-1 min-w-0 w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-r-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-mono text-slate-850"
                />
              </div>
              {slugError ? (
                <p className="text-xs text-rose-600 font-bold mt-1">{slugError}</p>
              ) : (
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Uniquement des lettres minuscules, chiffres et tirets.
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Visibility */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
              Confidentialité
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-3 border rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  !isPublic
                    ? "border-slate-800 bg-slate-50 text-slate-950 font-bold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs font-bold">Privée</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Visible par vous seul</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-3 border rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  isPublic
                    ? "border-indigo-600 bg-indigo-50/20 text-indigo-950 font-bold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs font-bold">Publique</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Accessible à tous via l'adresse</p>
                </div>
              </button>
            </div>
          </section>

          {/* Section 3: Editor Content */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                Biographie (Rédigez en Markdown)
              </h3>
              <a
                href="https://www.markdownguide.org/basic-syntax/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Guide Markdown</span>
              </a>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Votre Titre Principal&#10;&#10;Décrivez votre parcours ici, utilisez des listes à puces pour vos succès, du **gras** pour attirer l'attention ou de l'italique..."
              rows={15}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono text-xs leading-relaxed"
            />
          </section>
        </div>

        {/* Right Side: Real-time Markdown Preview */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1 px-1">
            <Eye className="h-4 w-4" />
            <span>Rendu HTML de l'accroche</span>
          </h3>
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 min-h-[500px] max-h-[800px] overflow-y-auto">
            {content.trim() ? (
              <MarkdownRenderer content={content} />
            ) : (
              <div className="text-center py-20 text-slate-400 italic text-sm">
                Rédigez du contenu pour voir le rendu en temps réel...
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
