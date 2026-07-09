import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { CV, Bio } from "../types";
import CVCard from "./CVCard";
import BioCard from "./BioCard";
import { FileText, Plus, UserCheck, RefreshCw, Layout, Code, HelpCircle, ArrowRight } from "lucide-react";
import { generateAndUploadPDF } from "../utils/pdfGenerator";

interface DashboardViewProps {
  user: any;
  setView: (view: string) => void;
  onEditCV: (cv: CV) => void;
  onEditBio: (bio: Bio) => void;
}

export default function DashboardView({
  user,
  setView,
  onEditCV,
  onEditBio,
}: DashboardViewProps) {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [bios, setBios] = useState<Bio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingCvId, setDownloadingCvId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch CVs
      const { data: cvData, error: cvErr } = await supabase
        .from("cvs")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (cvErr) throw cvErr;

      // 2. Fetch Bios
      const { data: bioData, error: bioErr } = await supabase
        .from("bios")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (bioErr) throw bioErr;

      setCvs(cvData || []);
      setBios(bioData || []);
    } catch (err: any) {
      console.error("Failed to load dashboard data:", err);
      setError("Impossible de charger vos données. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleCreateCV = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const reference = `CV-${year}-${randomId}`;

      const emptyCV = {
        user_id: user.id,
        reference,
        data: {
          nom: "",
          titre: "",
          photo: "",
          competences: [],
          experiences: [],
          formation: [],
        },
        summary: "",
        pdf_url: "",
        is_public: false,
        visibility: "private",
      };

      const { data, error } = await supabase
        .from("cvs")
        .insert(emptyCV)
        .select()
        .single();

      if (error) throw error;
      onEditCV(data);
    } catch (err: any) {
      console.error("Error creating CV:", err);
      alert("Échec de la création du CV : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBio = async () => {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const emailPrefix = user.email ? user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-") : "bio";
      const slug = `${emailPrefix}-${randomSuffix}`;

      const emptyBio = {
        user_id: user.id,
        slug,
        content: `# Biographie professionnelle\n\nÉcrivez votre parcours ici en Markdown...`,
        is_public: false,
      };

      const { data, error } = await supabase
        .from("bios")
        .insert(emptyBio)
        .select()
        .single();

      if (error) throw error;
      onEditBio(data);
    } catch (err: any) {
      console.error("Error creating Bio:", err);
      alert("Échec de la création de la Biographie : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCV = async (cvId: string) => {
    if (!supabase || !confirm("Êtes-vous sûr de vouloir supprimer ce CV définitivement ?")) return;
    try {
      const { error } = await supabase.from("cvs").delete().eq("id", cvId);
      if (error) throw error;
      setCvs(cvs.filter((c) => c.id !== cvId));
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  const handleDeleteBio = async (bioId: string) => {
    if (!supabase || !confirm("Êtes-vous sûr de vouloir supprimer cette biographie définitivement ?")) return;
    try {
      const { error } = await supabase.from("bios").delete().eq("id", bioId);
      if (error) throw error;
      setBios(bios.filter((b) => b.id !== bioId));
    } catch (err: any) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  const handleDownloadPDF = async (cv: CV) => {
    // If the PDF is already rendered on the CV public/editor views, we can generate it.
    // However, to keep it simple and seamless, we can load a small invisible CV preview container
    // in the DOM or download the pdf_url if it already exists, or generate it on demand.
    if (cv.pdf_url) {
      window.open(cv.pdf_url, "_blank");
      return;
    }

    // If PDF is not uploaded yet, guide them to edit and save which triggers pdf generation
    alert("Veuillez d'abord éditer et enregistrer votre CV pour générer son document PDF.");
    onEditCV(cv);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans space-y-12">
      {/* Intro Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center translate-x-12">
          <Layout className="w-80 h-80" />
        </div>
        <div className="space-y-3 max-w-xl relative z-10">
          <h2 className="font-display font-black text-2xl md:text-3xl tracking-tight leading-tight">
            Gérez vos CV & Biographies Professionnelles
          </h2>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Créez des profils d'exception, téléchargez des versions PDF certifiées de haute qualité et partagez vos compétences avec le reste du monde.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0 relative z-10">
          <button
            onClick={handleCreateCV}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau CV</span>
          </button>
          <button
            onClick={handleCreateBio}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 text-sm font-bold rounded-2xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-indigo-600" />
            <span>Nouvelle Bio</span>
          </button>
        </div>
      </div>

      {loading && cvs.length === 0 ? (
        <div className="text-center py-20">
          <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-500 text-sm font-semibold mt-3">Chargement de votre espace personnel...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl text-center max-w-lg mx-auto">
          <p className="text-sm font-bold text-rose-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-rose-100 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-200 transition-all cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {/* CV Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-800">Mes Curriculums Vitae</h3>
              </div>
              <button
                onClick={handleCreateCV}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Créer un CV</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {cvs.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                <FileText className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-semibold mb-3">Vous n'avez pas encore créé de CV.</p>
                <button
                  onClick={handleCreateCV}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Rédiger mon premier CV
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cvs.map((cv) => (
                  <CVCard
                    key={cv.id}
                    cv={cv}
                    onEdit={() => onEditCV(cv)}
                    onView={() => setView(`cv-view:${cv.reference}`)}
                    onDelete={() => handleDeleteCV(cv.id)}
                    onDownload={() => handleDownloadPDF(cv)}
                    isDownloading={downloadingCvId === cv.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Bio Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-800">Mes Biographies</h3>
              </div>
              <button
                onClick={handleCreateBio}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Créer une Bio</span>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {bios.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                <UserCheck className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-semibold mb-3">Vous n'avez pas encore de biographie publique.</p>
                <button
                  onClick={handleCreateBio}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Rédiger ma première biographie
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bios.map((bio) => (
                  <BioCard
                    key={bio.id}
                    bio={bio}
                    onEdit={() => onEditBio(bio)}
                    onView={() => setView(`bio-view:${bio.slug}`)}
                    onDelete={() => handleDeleteBio(bio.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Connecteur and Integration promo card */}
          <section className="bg-gradient-to-br from-indigo-50 to-slate-50 rounded-3xl p-6 md:p-8 border border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg font-mono text-[10px] font-bold">EXTENSION</span>
                <h4 className="font-display font-black text-base text-slate-800">Connecteur CV & Portfolio</h4>
              </div>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Connectez votre espace EbookStore avec vos portfolios personnels ou d'autres plateformes de recrutement en ajoutant notre script connecteur à votre site web.
              </p>
            </div>
            <button
              onClick={() => setView("install-connector")}
              className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
            >
              <span>Voir le guide d'intégration</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
