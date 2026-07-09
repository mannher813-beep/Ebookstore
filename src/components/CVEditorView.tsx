import React, { useState, useRef } from "react";
import { CV, Experience, Formation } from "../types";
import { supabase } from "../supabaseClient";
import TagInput from "./TagInput";
import DynamicList from "./DynamicList";
import { generateAndUploadPDF } from "../utils/pdfGenerator";
import { ArrowLeft, Save, Sparkles, RefreshCw, Eye, Globe, Lock, UserCheck, Image, Briefcase, GraduationCap, Layout } from "lucide-react";

interface CVEditorViewProps {
  cv: CV;
  onBack: () => void;
  onSave: (updatedCV: CV) => void;
}

export default function CVEditorView({
  cv,
  onBack,
  onSave,
}: CVEditorViewProps) {
  const [nom, setNom] = useState(cv.data.nom || "");
  const [titre, setTitre] = useState(cv.data.titre || "");
  const [photo, setPhoto] = useState(cv.data.photo || "");
  const [competences, setCompetences] = useState<string[]>(cv.data.competences || []);
  const [experiences, setExperiences] = useState<Experience[]>(cv.data.experiences || []);
  const [formation, setFormation] = useState<Formation[]>(cv.data.formation || []);
  const [summary, setSummary] = useState(cv.summary || "");
  const [visibility, setVisibility] = useState<"private" | "public" | "anonymous">(cv.visibility || "private");

  const [saving, setSaving] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Target preview container for PDF generation
  const previewRef = useRef<HTMLDivElement>(null);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      const token = session?.access_token;

      if (!token) {
        alert("Session introuvable. Veuillez vous reconnecter.");
        return;
      }

      const response = await fetch("/api/cv/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: { nom, titre, competences, experiences, formation },
        }),
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || "Échec de la génération.");

      if (resData.summary) {
        setSummary(resData.summary);
      }
    } catch (err: any) {
      console.error("AI Summary generation failed:", err);
      alert("Échec de la génération du résumé par l'IA : " + err.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      const is_public = visibility !== "private";
      const updatedData = { nom, titre, photo, competences, experiences, formation };

      // 1. Save data first to Supabase
      const { data: savedCV, error: saveErr } = await supabase
        .from("cvs")
        .update({
          data: updatedData,
          summary,
          visibility,
          is_public,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cv.id)
        .select()
        .single();

      if (saveErr) throw saveErr;

      // 2. Generate PDF and upload
      // Wait a short moment to ensure preview DOM is rendered
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      let finalPdfUrl = savedCV.pdf_url;
      try {
        const publicPdfUrl = await generateAndUploadPDF(
          "cv-rendering-stage",
          cv.user_id,
          cv.reference
        );
        
        if (publicPdfUrl) {
          finalPdfUrl = publicPdfUrl;
          // 3. Update pdf_url in CV row
          await supabase
            .from("cvs")
            .update({ pdf_url: publicPdfUrl })
            .eq("id", cv.id);
        }
      } catch (pdfErr) {
        console.error("PDF auto generation or upload failed:", pdfErr);
        // Do not crash the save flow, just warn the user
        alert("CV sauvegardé avec succès, mais la génération automatique du PDF a échoué. Vous pourrez réessayer en sauvegardant de nouveau.");
      }

      onSave({
        ...savedCV,
        pdf_url: finalPdfUrl,
      });
    } catch (err: any) {
      console.error("Error saving CV:", err);
      alert("Échec de la sauvegarde du CV : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const experienceTemplate: Experience = {
    entreprise: "",
    poste: "",
    date_debut: "",
    date_fin: "",
    description: "",
  };

  const formationTemplate: Formation = {
    ecole: "",
    diplome: "",
    annee: "",
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
              Édition du CV
            </h2>
            <p className="text-xs text-slate-400 font-semibold font-mono">
              RÉFÉRENCE : {cv.reference}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Enregistrer & Générer le PDF</span>
          </button>
        </div>
      </div>

      {/* Editor Main Content - Responsive split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Forms */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Civil Details */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
              Informations du candidat
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nom Complet
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Titre professionnel
                </label>
                <input
                  type="text"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Développeur Full Stack"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Image className="h-3.5 w-3.5" />
                <span>URL de la photo de profil</span>
              </label>
              <input
                type="text"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                placeholder="Ex: https://images.unsplash.com/... ou URL absolue"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-xs font-mono text-slate-700"
              />
            </div>
          </section>

          {/* Section 2: Visibility settings */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
              Confidentialité & Visibilité publique
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setVisibility("private")}
                className={`p-3 border rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  visibility === "private"
                    ? "border-slate-800 bg-slate-50 text-slate-950 font-bold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs font-bold">Privé</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Visible par vous seul</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`p-3 border rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  visibility === "public"
                    ? "border-indigo-600 bg-indigo-50/20 text-indigo-950 font-bold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Globe className="h-4 w-4 text-indigo-500 shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs font-bold">Public</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Partageable par URL publique</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility("anonymous")}
                className={`p-3 border rounded-xl flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                  visibility === "anonymous"
                    ? "border-amber-600 bg-amber-50/20 text-amber-950 font-bold"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <UserCheck className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="leading-tight">
                  <p className="text-xs font-bold">Anonyme</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Public sans nom de famille</p>
                </div>
              </button>
            </div>
          </section>

          {/* Section 3: Resume summary & AI tool */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
                Accroche / Résumé professionnel
              </h3>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-extrabold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer border border-indigo-100/50"
              >
                {generatingSummary ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                )}
                <span>Générer avec l'IA</span>
              </button>
            </div>

            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Rédigez une accroche professionnelle impactante décrivant votre parcours ou générez-la directement avec notre assistant Gemini AI..."
              rows={4}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-sans leading-relaxed"
            />
          </section>

          {/* Section 4: Skills / competencies */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-600 rounded-full"></span>
              Compétences clés & Technologies
            </h3>
            <TagInput tags={competences} onChange={setCompetences} />
          </section>

          {/* Section 5: Experiences (Dynamic List) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <DynamicList<Experience>
              title="Expériences Professionnelles"
              items={experiences}
              onChange={setExperiences}
              newItemTemplate={experienceTemplate}
              addButtonLabel="Ajouter une expérience"
              emptyMessage="Aucune expérience professionnelle listée."
              renderItemForm={(item, idx, updateItem) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Entreprise
                    </label>
                    <input
                      type="text"
                      value={item.entreprise}
                      onChange={(e) => updateItem({ entreprise: e.target.value })}
                      placeholder="Ex: Google Inc."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Poste
                    </label>
                    <input
                      type="text"
                      value={item.poste}
                      onChange={(e) => updateItem({ poste: e.target.value })}
                      placeholder="Ex: Développeur Frontend"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Date de début
                    </label>
                    <input
                      type="text"
                      value={item.date_debut}
                      onChange={(e) => updateItem({ date_debut: e.target.value })}
                      placeholder="Ex: Oct 2024"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Date de fin
                    </label>
                    <input
                      type="text"
                      value={item.date_fin}
                      onChange={(e) => updateItem({ date_fin: e.target.value })}
                      placeholder="Ex: Présent ou Jan 2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Description des tâches
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem({ description: e.target.value })}
                      placeholder="Rédigez les missions principales accomplies..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            />
          </section>

          {/* Section 6: Formations / Diplomas */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <DynamicList<Formation>
              title="Formations & Diplômes"
              items={formation}
              onChange={setFormation}
              newItemTemplate={formationTemplate}
              addButtonLabel="Ajouter une formation"
              emptyMessage="Aucune formation ajoutée."
              renderItemForm={(item, idx, updateItem) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Établissement / École
                    </label>
                    <input
                      type="text"
                      value={item.ecole}
                      onChange={(e) => updateItem({ ecole: e.target.value })}
                      placeholder="Ex: École Polytechnique"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Diplôme obtenu
                    </label>
                    <input
                      type="text"
                      value={item.diplome}
                      onChange={(e) => updateItem({ diplome: e.target.value })}
                      placeholder="Ex: Master Informatique"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Année d'obtention
                    </label>
                    <input
                      type="text"
                      value={item.annee}
                      onChange={(e) => updateItem({ annee: e.target.value })}
                      placeholder="Ex: 2025"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            />
          </section>
        </div>

        {/* Right Side: Real-time Live Preview container */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
              <Layout className="h-4 w-4" />
              <span>Aperçu en temps réel (A4)</span>
            </h3>
            {cv.pdf_url && (
              <a
                href={cv.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>Accéder au PDF existant</span>
              </a>
            )}
          </div>

          {/* Rendering Container Stage */}
          <div className="border border-slate-200 shadow-xl rounded-2xl overflow-hidden bg-slate-100 p-4 max-h-[800px] overflow-y-auto">
            <div
              id="cv-rendering-stage"
              ref={previewRef}
              className="bg-white p-8 md:p-10 w-full min-h-[842px] max-w-[595px] mx-auto shadow-sm border border-slate-200 text-slate-900 font-sans space-y-6"
            >
              {/* Header profile info */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {visibility === "anonymous" ? (nom ? nom.split(" ")[0] + " (Anonymisé)" : "Candidat") : (nom || "Votre Nom")}
                  </h1>
                  <h2 className="text-sm font-bold text-indigo-650 uppercase tracking-wide">
                    {titre || "Titre du Profil"}
                  </h2>
                </div>
                {photo ? (
                  <img
                    src={photo}
                    alt={nom}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full object-cover border border-slate-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl border border-slate-200 uppercase">
                    {(nom || "V").charAt(0)}
                  </div>
                )}
              </div>

              {/* Hook summary section */}
              {summary && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-black uppercase text-indigo-650 tracking-wider">
                    Profil / Résumé
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed text-justify">
                    {summary}
                  </p>
                </div>
              )}

              {/* Skills section */}
              {competences.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-black uppercase text-indigo-650 tracking-wider">
                    Compétences
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {competences.map((comp, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experiences section */}
              {experiences.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-indigo-650 tracking-wider">
                    Expériences Professionnelles
                  </h3>
                  <div className="space-y-3">
                    {experiences.map((exp, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold text-slate-900 uppercase">
                            {exp.poste || "Poste non défini"}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-500 font-mono">
                            {exp.date_debut || "?"} - {exp.date_fin || "?"}
                          </span>
                        </div>
                        <p className="text-[10px] font-semibold text-indigo-600/80">
                          {exp.entreprise || "Entreprise non définie"}
                        </p>
                        {exp.description && (
                          <p className="text-[10px] text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Educations section */}
              {formation.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase text-indigo-650 tracking-wider">
                    Formation
                  </h3>
                  <div className="space-y-2">
                    {formation.map((form, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[10px]">
                        <div>
                          <h4 className="font-bold text-slate-900">{form.diplome || "Diplôme"}</h4>
                          <p className="text-slate-500">{form.ecole || "Établissement"}</p>
                        </div>
                        <span className="font-bold text-slate-400 font-mono">{form.annee || "?"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
