import React, { useState, useEffect } from "react";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  ShieldAlert, 
  Send, 
  Clock, 
  ChevronRight, 
  Building, 
  CheckCircle, 
  Loader2, 
  AlertTriangle,
  ArrowLeft,
  X,
  FileText,
  User,
  Zap
} from "lucide-react";
import { API_BASE_URL } from "../supabaseClient";
import { JobOffer, CV, Bio } from "../types";

interface JobsViewProps {
  currentUser: any;
  onOpenAuth: () => void;
}

export default function JobsView({ currentUser, onOpenAuth }: JobsViewProps) {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filtering States
  const [query, setQuery] = useState("");
  const [selectedLieu, setSelectedLieu] = useState("all");
  const [selectedSecteur, setSelectedSecteur] = useState("all");
  const [selectedContrat, setSelectedContrat] = useState("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minSalary, setMinSalary] = useState("");

  // Detailed view
  const [selectedJob, setSelectedJob] = useState<JobOffer | null>(null);
  const [loadingJobDetail, setLoadingJobDetail] = useState(false);

  // Application process
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [userCvs, setUserCvs] = useState<CV[]>([]);
  const [userBios, setUserBios] = useState<Bio[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [selectedBioId, setSelectedBioId] = useState("");
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);

  // Reporting process
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  // Status banners
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("sb-token") || "";
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Fetch detailed job with views increment
  const handleViewJobDetails = async (jobId: string) => {
    setLoadingJobDetail(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedJob(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingJobDetail(false);
    }
  };

  // Open apply modal and fetch user assets
  const handleOpenApply = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setApplyModalOpen(true);
    
    // Fetch user CVs and Bios
    try {
      const token = localStorage.getItem("sb-token") || "";
      const { supabase } = await import("../supabaseClient");
      if (!supabase) return;

      const { data: cvs } = await supabase
        .from("cvs")
        .select("*")
        .eq("user_id", currentUser.id);

      const { data: bios } = await supabase
        .from("bios")
        .select("*")
        .eq("user_id", currentUser.id);

      setUserCvs(cvs || []);
      setUserBios(bios || []);
      
      if (cvs && cvs.length > 0) setSelectedCvId(cvs[0].id);
      if (bios && bios.length > 0) setSelectedBioId(bios[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit job application
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    if (!selectedCvId && !selectedBioId) {
      setBannerError("Veuillez sélectionner au moins un CV ou une Biographie pour postuler.");
      return;
    }

    setApplying(true);
    setBannerError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${selectedJob.id}/apply`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          cv_id: selectedCvId || null,
          bio_id: selectedBioId || null,
          message: applyMessage
        })
      });

      if (res.ok) {
        setBannerMsg("Votre candidature a été transmise avec succès au recruteur !");
        setApplyModalOpen(false);
        setApplyMessage("");
      } else {
        const err = await res.json();
        setBannerError(err.error || "Une erreur est survenue.");
      }
    } catch (e: any) {
      setBannerError(e.message);
    } finally {
      setApplying(false);
    }
  };

  // Submit community report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !reportReason) return;

    setReporting(true);
    setBannerError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${selectedJob.id}/report`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ raison: reportReason })
      });

      if (res.ok) {
        setBannerMsg("Merci pour votre vigilance. L'offre a été signalée à l'équipe de modération.");
        setReportModalOpen(false);
        setReportReason("");
      } else {
        const err = await res.json();
        setBannerError(err.error || "Impossible d'envoyer le rapport.");
      }
    } catch (e: any) {
      setBannerError(e.message);
    } finally {
      setReporting(false);
    }
  };

  // Unique filter values derived from lists
  const lieux = Array.from(new Set(jobs.map(j => j.lieu))).filter(Boolean);
  const secteurs = Array.from(new Set(jobs.map(j => j.secteur))).filter(Boolean);

  // Client side filtering logic
  const filteredJobs = jobs.filter(job => {
    const matchesQuery = 
      job.titre.toLowerCase().includes(query.toLowerCase()) ||
      job.entreprise.toLowerCase().includes(query.toLowerCase()) ||
      job.description.toLowerCase().includes(query.toLowerCase()) ||
      (job.competences && job.competences.some(c => c.toLowerCase().includes(query.toLowerCase())));

    const matchesLieu = selectedLieu === "all" || job.lieu === selectedLieu;
    const matchesSecteur = selectedSecteur === "all" || job.secteur === selectedSecteur;
    const matchesContrat = selectedContrat === "all" || job.type_contrat === selectedContrat;
    const matchesRemote = !remoteOnly || job.remote === true;
    const matchesSalary = !minSalary || (job.salaire_min && job.salaire_min >= Number(minSalary)) || (job.salaire_max && job.salaire_max >= Number(minSalary));

    return matchesQuery && matchesLieu && matchesSecteur && matchesContrat && matchesRemote && matchesSalary;
  });

  return (
    <div id="jobs_view_container" className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Banner system messages */}
      {bannerMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-xs font-semibold hover:underline">Fermer</button>
        </div>
      )}

      {bannerError && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button onClick={() => setBannerError(null)} className="text-xs font-semibold hover:underline">Fermer</button>
        </div>
      )}

      {/* Detail view page */}
      {selectedJob ? (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedJob(null)}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour aux offres d'emploi
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400">
                    {selectedJob.type_contrat?.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-400">Posté le {new Date(selectedJob.created_at || "").toLocaleDateString()}</span>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedJob.titre}</h2>
                <p className="text-md text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedJob.entreprise}</span>
                </p>

                <div className="flex flex-wrap gap-4 mt-4 py-4 border-t border-b border-slate-100 dark:border-slate-800 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <MapPin className="h-4 w-4 text-slate-400" /> {selectedJob.lieu}
                  </div>
                  {selectedJob.remote && (
                    <span className="px-2 py-0.5 text-xs bg-emerald-500/15 text-emerald-500 font-bold rounded">
                      Télétravail autorisé 🌐
                    </span>
                  )}
                  {selectedJob.salaire_min && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <DollarSign className="h-4 w-4 text-slate-400" /> 
                      {selectedJob.salaire_min?.toLocaleString()} {selectedJob.salaire_max ? `- ${selectedJob.salaire_max?.toLocaleString()}` : ""} {selectedJob.devise}
                    </div>
                  )}
                </div>

                {/* Offer description */}
                <div className="mt-6">
                  <h3 className="font-bold text-slate-900 dark:text-white text-md mb-3">Description du poste</h3>
                  <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedJob.description}
                  </div>
                </div>

                {/* Skill Keywords */}
                {selectedJob.competences && selectedJob.competences.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">Compétences clés</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJob.competences.map((c, idx) => (
                        <span key={idx} className="px-3 py-1 bg-slate-150 dark:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar actions */}
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <h3 className="font-bold text-slate-900 dark:text-white mb-2">Postuler à cette offre</h3>
                <p className="text-xs text-slate-400 mb-6">
                  Transmettez votre profil de candidat qualifié avec vos coordonnées pour initier l'entretien.
                </p>

                <button
                  onClick={handleOpenApply}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  <Send className="h-4 w-4" /> Envoyer ma candidature
                </button>

                <button
                  onClick={() => {
                    if (!currentUser) onOpenAuth();
                    else setReportModalOpen(true);
                  }}
                  className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50/20 rounded-lg border border-slate-200 dark:border-slate-800 transition-all"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Signaler cette offre
                </button>
              </div>

              {/* View counter widget */}
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                Cette offre a été consultée <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedJob.vues || 0}</span> fois.
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Jobs Catalog list view */
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Offres d'emploi en Afrique</h2>
            <p className="text-sm text-slate-400 mt-1">
              Trouvez des emplois technologiques validés dans les pôles d'innovation africains.
            </p>
          </div>

          {/* Search and Advanced Filters */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400 top-3" />
                <input
                  type="text"
                  placeholder="Rechercher par poste, mot-clé, entreprise..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-950 dark:text-white focus:outline-none"
                />
              </div>

              {/* Lieu Filter */}
              <select
                value={selectedLieu}
                onChange={(e) => setSelectedLieu(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-950 dark:text-white font-medium"
              >
                <option value="all">Tous les pays/villes</option>
                {lieux.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              {/* Secteur Filter */}
              <select
                value={selectedSecteur}
                onChange={(e) => setSelectedSecteur(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg dark:bg-slate-950 dark:text-white font-medium"
              >
                <option value="all">Tous les secteurs</option>
                {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Contrat Filter */}
              <select
                value={selectedContrat}
                onChange={(e) => setSelectedContrat(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md dark:bg-slate-950 dark:text-white font-semibold"
              >
                <option value="all">Tous types de contrat</option>
                <option value="cdi">CDI uniquement</option>
                <option value="cdd">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Freelance</option>
                <option value="alternance">Alternance</option>
              </select>

              {/* Remote only toggle */}
              <label className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={remoteOnly} 
                  onChange={(e) => setRemoteOnly(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Télétravail uniquement 🌐
              </label>

              {/* Salary filter */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-slate-400 font-semibold">Salaire min :</span>
                <input 
                  type="number" 
                  placeholder="XAF" 
                  value={minSalary}
                  onChange={(e) => setMinSalary(e.target.value)}
                  className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Job Offers Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 mt-2">Recherche des offres d'emploi...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-16 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">Aucune offre d'emploi ne correspond à vos critères de recherche.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map((job) => (
                <div 
                  key={job.id}
                  onClick={() => handleViewJobDetails(job.id)}
                  className={`p-6 bg-white dark:bg-slate-900 border ${
                    job.is_boosted ? "border-amber-200 dark:border-amber-900/40 bg-amber-500/[0.01]" : "border-slate-200 dark:border-slate-800"
                  } hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all rounded-2xl cursor-pointer`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                          {job.type_contrat?.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-400">• {job.lieu}</span>
                        {job.remote && (
                          <span className="text-xs text-slate-400">• Télétravail 🌐</span>
                        )}
                        {job.is_boosted && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase rounded border border-amber-500/20">
                            <Zap className="h-2.5 w-2.5" /> Boosté ⚡
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight hover:text-indigo-650">{job.titre}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Entreprise : <span className="font-medium text-slate-700 dark:text-slate-300">{job.entreprise}</span>
                      </p>

                      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {job.description}
                      </div>

                      {/* Job skills */}
                      {job.competences && job.competences.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.competences.map((c, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col md:items-end justify-between self-stretch shrink-0">
                      {job.salaire_min ? (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {job.salaire_min?.toLocaleString()} {job.devise} / mois
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Salaire non spécifié</span>
                      )}

                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold mt-4">
                        Consulter l'offre <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: SUBMIT APPLICATION */}
      {applyModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-250 dark:border-slate-800 shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Postuler - {selectedJob.titre}</h3>
              <button onClick={() => setApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-4">
              
              {/* CV choice */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choisir mon CV enregistré</label>
                {userCvs.length === 0 ? (
                  <p className="text-xs text-rose-500 italic">Aucun CV trouvé. Allez dans 'Mon Espace CV' pour en créer un.</p>
                ) : (
                  <select
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 text-sm dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">-- Ne pas joindre de CV --</option>
                    {userCvs.map(cv => (
                      <option key={cv.id} value={cv.id}>
                        {cv.data?.titre || cv.titre_poste || "Mon CV"} ({cv.reference})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bio choice */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Choisir ma Biographie</label>
                {userBios.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune biographie trouvée.</p>
                ) : (
                  <select
                    value={selectedBioId}
                    onChange={(e) => setSelectedBioId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 text-sm dark:bg-slate-950 dark:text-white"
                  >
                    <option value="">-- Ne pas joindre de Biographie --</option>
                    {userBios.map(bio => (
                      <option key={bio.id} value={bio.id}>
                        Biographie : {bio.slug}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Cover message */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Lettre de motivation / Message</label>
                <textarea
                  required
                  rows={4}
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  placeholder="Expliquez brièvement pourquoi vous êtes le candidat idéal pour ce poste..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white text-sm dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Confirmer ma candidature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORT OFFER */}
      {reportModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h3 className="font-bold text-md text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" /> Signaler une offre suspecte
              </h3>
              <button onClick={() => setReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-4">
              <p className="text-xs text-slate-400">
                L'offre semble être une arnaque, contient des propos inappropriés, ou l'entreprise usurpe une identité ? Signalez-le.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Raison du signalement</label>
                <textarea
                  required
                  rows={4}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Veuillez décrire le problème avec le plus de détails possibles..."
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white text-xs dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reporting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  {reporting ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : "Envoyer le signalement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
