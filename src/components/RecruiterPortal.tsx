import React, { useState, useEffect } from "react";
import { 
  Building, 
  Plus, 
  Briefcase, 
  Users, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle, 
  Send, 
  Sparkles, 
  Search, 
  User, 
  FileText, 
  MapPin, 
  DollarSign, 
  Award,
  Clock,
  ExternalLink,
  BookOpen
} from "lucide-react";
import { API_BASE_URL } from "../supabaseClient";
import { JobOffer, RecruiterProfile, CV, JobApplication } from "../types";

interface RecruiterPortalProps {
  currentUser: any;
}

export default function RecruiterPortal({ currentUser }: RecruiterPortalProps) {
  const [activeSubTab, setActiveSubTab] = useState<"profile" | "post-offer" | "my-offers" | "applications" | "match">("profile");

  // Profile States
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [secteur, setSecteur] = useState("Technologie");
  const [siteWeb, setSiteWeb] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  
  // Job Post States
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerTitre, setOfferTitre] = useState("");
  const [offerLieu, setOfferLieu] = useState("");
  const [offerSecteur, setOfferSecteur] = useState("Technologie");
  const [offerContrat, setOfferContrat] = useState<any>("cdi");
  const [offerRemote, setOfferRemote] = useState(false);
  const [offerSalMin, setOfferSalMin] = useState("");
  const [offerSalMax, setOfferSalMax] = useState("");
  const [offerCompetences, setOfferCompetences] = useState("");
  const [offerDesc, setOfferDesc] = useState("");

  // AI draft states
  const [aiPoste, setAiPoste] = useState("");
  const [aiPointsBruts, setAiPointsBruts] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  // Lists
  const [myOffers, setMyOffers] = useState<JobOffer[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [matchedCvs, setMatchedCvs] = useState<any[]>([]);

  // Loadings and messages
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem("sb-token") || "";
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchRecruiterProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/profile`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setProfile(data);
          setNomEntreprise(data.nom_entreprise || "");
          setSecteur(data.secteur || "Technologie");
          setSiteWeb(data.site_web || "");
          setDescription(data.description || "");
          setLogoUrl(data.logo_url || "");
          if (data.verification_documents && data.verification_documents.length > 0) {
            setDocumentUrl(data.verification_documents[0] || "");
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyOffers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/my`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setMyOffers(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/recruiter`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setApplications(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMatchedCandidates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/candidates`, { headers: getAuthHeader() });
      if (res.ok) {
        const data = await res.json();
        setMatchedCvs(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      await fetchRecruiterProfile();
      await fetchMyOffers();
      await fetchApplications();
      await fetchMatchedCandidates();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Save/Update Recruiter profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setMsg(null);
    setError(null);

    const payload = {
      nom_entreprise: nomEntreprise,
      secteur,
      site_web: siteWeb,
      description,
      logo_url: logoUrl,
      verification_documents: documentUrl ? [documentUrl] : null
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/recruiter/profile`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMsg("Votre fiche entreprise a été mise à jour. Les modérateurs vont étudier vos justificatifs d'activité.");
        fetchRecruiterProfile();
      } else {
        const err = await res.json();
        setError(err.error || "Une erreur est survenue.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Generate offer desc using AI
  const handleGenerateAiOffer = async () => {
    if (!aiPoste || !aiPointsBruts) {
      setError("Veuillez renseigner le poste recherché et quelques points clés de l'offre.");
      return;
    }
    setGeneratingAi(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/job/generate-desc`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({
          poste: aiPoste,
          points_bruts: aiPointsBruts,
          entreprise: nomEntreprise || "Notre Entreprise"
        })
      });

      if (res.ok) {
        const result = await res.json();
        setOfferTitre(result.titre || aiPoste);
        setOfferDesc(result.description || "");
        setMsg("Offre d'emploi rédigée par l'IA avec succès ! Veuillez relire le projet généré.");
        setActiveSubTab("post-offer");
      } else {
        const err = await res.json();
        setError(err.error || "L'assistance IA n'a pas pu s'exécuter.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  // Submit Job Offer
  const handlePostOffer = async (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    setSaveLoading(true);
    setMsg(null);
    setError(null);

    const skillsArray = offerCompetences.split(",").map(c => c.trim()).filter(Boolean);

    const payload = {
      id: offerId,
      titre: offerTitre,
      description: offerDesc,
      entreprise: nomEntreprise || "Notre Entreprise",
      lieu: offerLieu,
      secteur: offerSecteur,
      type_contrat: offerContrat,
      remote: offerRemote,
      salaire_min: offerSalMin ? Number(offerSalMin) : null,
      salaire_max: offerSalMax ? Number(offerSalMax) : null,
      competences: skillsArray,
      statut: isDraft ? "draft" : "active"
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setMsg(isDraft ? "Offre d'emploi sauvegardée en brouillon." : "Offre d'emploi publiée ! Elle va être examinée par un modérateur.");
        // clear post form
        setOfferId(null);
        setOfferTitre("");
        setOfferLieu("");
        setOfferCompetences("");
        setOfferDesc("");
        setOfferSalMin("");
        setOfferSalMax("");
        fetchMyOffers();
        setActiveSubTab("my-offers");
      } else {
        const err = await res.json();
        setError(err.error || "Impossible d'enregistrer l'offre.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  // Set offer to edit in form
  const handleEditOffer = (offer: JobOffer) => {
    setOfferId(offer.id);
    setOfferTitre(offer.titre);
    setOfferLieu(jobLieuValue(offer.lieu));
    setOfferSecteur(offer.secteur);
    setOfferContrat(offer.type_contrat);
    setOfferRemote(offer.remote);
    setOfferSalMin(offer.salaire_min?.toString() || "");
    setOfferSalMax(offer.salaire_max?.toString() || "");
    setOfferCompetences(offer.competences ? offer.competences.join(", ") : "");
    setOfferDesc(offer.description);
    setActiveSubTab("post-offer");
  };

  // Safely get location
  const jobLieuValue = (l: string | null | undefined) => l || "";

  // Handle Application Status Update
  const handleUpdateAppStatus = async (appId: string, newStatus: "acceptee" | "refusee") => {
    setActionLoading(appId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}/status`, {
        method: "POST",
        headers: getAuthHeader(),
        body: JSON.stringify({ statut: newStatus })
      });

      if (res.ok) {
        setMsg(`Le statut de la candidature a été mis à jour avec succès.`);
        fetchApplications();
      } else {
        const err = await res.json();
        setError(err.error || "Échec de modification du statut.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div id="recruiter_portal_wrapper" className="max-w-7xl mx-auto px-4 py-8">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4 border-b border-slate-100 dark:border-slate-850 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
            <Building className="h-6 w-6 text-indigo-650" /> Espace Recruteur Professionnel
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Déposez vos offres d'emploi, accédez à des candidats qualifiés et automatisez vos recrutements.
          </p>
        </div>

        {/* Verification Status Banner */}
        {profile && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Validation entreprise :</span>
            {profile.verification_status === "verified" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/25 rounded-lg border border-emerald-500/20">
                <CheckCircle className="h-3.5 w-3.5" /> Entreprise Validée
              </span>
            ) : profile.verification_status === "rejected" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/25 rounded-lg border border-rose-500/20">
                <XCircle className="h-3.5 w-3.5" /> Réfusée
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/25 rounded-lg border border-amber-500/20 animate-pulse">
                <Clock className="h-3.5 w-3.5" /> En cours d'étude
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {msg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="ml-auto font-semibold hover:underline">Fermer</button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/15 border border-red-100 dark:border-red-900/30 text-red-850 dark:text-red-400 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto font-semibold hover:underline">Fermer</button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-2 text-sm font-semibold">
        <button
          onClick={() => setActiveSubTab("profile")}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "profile" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Building className="h-4 w-4" /> 1. Fiche Entreprise
        </button>

        <button
          onClick={() => setActiveSubTab("post-offer")}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "post-offer" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Plus className="h-4 w-4" /> 2. Créer une offre
        </button>

        <button
          onClick={() => {
            setActiveSubTab("my-offers");
            fetchMyOffers();
          }}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "my-offers" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Briefcase className="h-4 w-4" /> 3. Mes offres ({myOffers.length})
        </button>

        <button
          onClick={() => {
            setActiveSubTab("applications");
            fetchApplications();
          }}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "applications" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Users className="h-4 w-4" /> 4. Candidatures ({applications.length})
        </button>

        <button
          onClick={() => {
            setActiveSubTab("match");
            fetchMatchedCandidates();
          }}
          className={`px-4 py-2.5 border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === "match" ? "border-indigo-600 text-indigo-650" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" /> 5. Suggestions IA ({matchedCvs.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500 mt-2">Chargement du portail recruteur...</p>
        </div>
      ) : (
        <div id="recruiter_portal_content">
          
          {/* TAB: PROFILE CONFIGURATION */}
          {activeSubTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleSaveProfile} className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
                <h3 className="font-bold text-lg text-slate-950 dark:text-white">Fiche d'identité de l'entreprise</h3>
                <p className="text-xs text-slate-400">
                  Complétez ces informations pour justifier de l'existence légale de votre entreprise et obtenir l'agrément de publication.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom légal de l'entreprise</label>
                    <input 
                      required
                      type="text" 
                      value={nomEntreprise} 
                      onChange={(e) => setNomEntreprise(e.target.value)}
                      placeholder="e.g. Afritech Solutions" 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secteur d'activité</label>
                    <select
                      value={secteur}
                      onChange={(e) => setSecteur(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="Technologie">Technologie / Informatique</option>
                      <option value="Banque">Banque / Finance</option>
                      <option value="Télécommunications">Télécommunications</option>
                      <option value="Santé">Santé / Biotech</option>
                      <option value="Éducation">Éducation / E-Learning</option>
                      <option value="Agriculture">Agriculture / Agritech</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Site internet corporate (URL)</label>
                    <input 
                      type="url" 
                      value={siteWeb} 
                      onChange={(e) => setSiteWeb(e.target.value)}
                      placeholder="https://afritech.cm" 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL de votre logo d'entreprise</label>
                    <input 
                      type="url" 
                      value={logoUrl} 
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..." 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Justificatif d'immatriculation légal (Lien document)</label>
                  <input 
                    required
                    type="url" 
                    value={documentUrl} 
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    placeholder="Lien PDF de votre registre du commerce, patente ou agrément..." 
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">Obligatoire pour l'évaluation et la validation par les modérateurs.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Présentation de l'entreprise</label>
                  <textarea 
                    required
                    rows={5}
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Présentez brièvement vos activités, vos valeurs et votre politique de recrutement..." 
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-colors"
                  >
                    {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enregistrer ma fiche
                  </button>
                </div>
              </form>

              {/* Sidebar guidance */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <h4 className="font-bold text-slate-950 dark:text-white mb-2">Processus d'habilitation</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sur Recrutement Afrique, la sécurité et l'authenticité des offres d'emploi sont primordiales.
                  </p>
                  <ul className="text-xs text-slate-500 list-disc list-inside mt-3 space-y-1.5">
                    <li>Renseignez scrupuleusement vos documents juridiques réels.</li>
                    <li>Un modérateur valide votre compte sous 24 heures.</li>
                    <li>Tant que vous n'êtes pas validé, vous pouvez préparer des brouillons d'offres d'emploi.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB: POST JOB OFFER (WITH AI DRAFTING ASSISTANCE) */}
          {activeSubTab === "post-offer" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left : Form block */}
              <form onSubmit={(e) => handlePostOffer(e, false)} className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4">
                  <h3 className="font-bold text-lg text-slate-950 dark:text-white">
                    {offerId ? "Éditer l'offre d'emploi" : "Créer une nouvelle offre d'emploi"}
                  </h3>
                  {offerId && (
                    <button 
                      type="button" 
                      onClick={() => { setOfferId(null); setOfferTitre(""); setOfferDesc(""); setOfferLieu(""); }}
                      className="text-xs font-semibold text-rose-500 hover:underline"
                    >
                      Annuler l'édition
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titre du poste</label>
                  <input 
                    required
                    type="text" 
                    value={offerTitre} 
                    onChange={(e) => setOfferTitre(e.target.value)}
                    placeholder="e.g. Développeur Frontend Senior React" 
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lieu / Ville / Pays</label>
                    <input 
                      required
                      type="text" 
                      value={offerLieu} 
                      onChange={(e) => setOfferLieu(e.target.value)}
                      placeholder="e.g. Douala, Cameroun" 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secteur technologique</label>
                    <input 
                      required
                      type="text" 
                      value={offerSecteur} 
                      onChange={(e) => setOfferSecteur(e.target.value)}
                      placeholder="e.g. Développement Web, Cloud Computing" 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type de contrat</label>
                    <select
                      value={offerContrat}
                      onChange={(e) => setOfferContrat(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="cdi">CDI</option>
                      <option value="cdd">CDD</option>
                      <option value="stage">Stage / Internship</option>
                      <option value="freelance">Freelance</option>
                      <option value="alternance">Alternance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salaire mensuel min (XAF)</label>
                    <input 
                      type="number" 
                      value={offerSalMin} 
                      onChange={(e) => setOfferSalMin(e.target.value)}
                      placeholder="e.g. 400000" 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Salaire mensuel max (XAF)</label>
                    <input 
                      type="number" 
                      value={offerSalMax} 
                      onChange={(e) => setOfferSalMax(e.target.value)}
                      placeholder="e.g. 800000" 
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={offerRemote} 
                      onChange={(e) => setOfferRemote(e.target.checked)}
                      className="rounded text-indigo-650 border-slate-300"
                    />
                    Télétravail autorisé (Remote)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mots-clés de compétences requises (Séparés par des virgules)</label>
                  <input 
                    type="text" 
                    value={offerCompetences} 
                    onChange={(e) => setOfferCompetences(e.target.value)}
                    placeholder="e.g. React, TypeScript, Tailwind CSS, REST API" 
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description rédigée de l'offre</label>
                  <textarea 
                    required
                    rows={8}
                    value={offerDesc} 
                    onChange={(e) => setOfferDesc(e.target.value)}
                    placeholder="Détaillez le poste, les responsabilités, les compétences indispensables..." 
                    className="w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-white dark:bg-slate-950 dark:text-white font-sans whitespace-pre-wrap leading-relaxed"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={saveLoading}
                    onClick={(e) => handlePostOffer(e, true)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Enregistrer en Brouillon (Draft)
                  </button>
                  
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                  >
                    {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publier l'offre d'emploi
                  </button>
                </div>
              </form>

              {/* Right: AI Assist Drafting Box */}
              <div className="space-y-6">
                <div className="p-6 bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded-2xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Sparkles className="h-24 w-24 text-indigo-400" />
                  </div>
                  
                  <h4 className="font-bold text-md text-white flex items-center gap-2 mb-2">
                    <Sparkles className="h-4.5 w-4.5 text-amber-400" /> Assistance Rédaction IA
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Saisissez des idées brutes en vrac et laissez l'IA générer un draft d'offre technologique hyper-structuré au format Markdown.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Nom du Poste</label>
                      <input 
                        type="text" 
                        value={aiPoste} 
                        onChange={(e) => setAiPoste(e.target.value)}
                        placeholder="e.g. Développeur Python Backend" 
                        className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs bg-slate-900 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Points clés, technos, compétences</label>
                      <textarea 
                        rows={4}
                        value={aiPointsBruts} 
                        onChange={(e) => setAiPointsBruts(e.target.value)}
                        placeholder="e.g. Django, API, postgresql, 3 ans exp, douala, bon salaire, esprit d'équipe..." 
                        className="w-full px-3 py-2 border border-slate-800 rounded-lg text-xs bg-slate-900 text-white"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={generatingAi}
                      onClick={handleGenerateAiOffer}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      {generatingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-400" />} 
                      Rédiger avec Gemini IA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY JOB OFFERS */}
          {activeSubTab === "my-offers" && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-slate-950 dark:text-white">Vos offres déposées</h3>
              
              {myOffers.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Vous n'avez pas encore créé d'offres d'emploi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myOffers.map((offer) => (
                    <div key={offer.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400">
                            {offer.type_contrat?.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-400">• {jobLieuValue(offer.lieu)}</span>
                          {offer.is_boosted && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded animate-pulse">
                              BOOSTÉ ⚡
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{offer.titre}</h4>
                        
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                          <span>Statut : <strong>{offer.statut}</strong></span>
                          <span>•</span>
                          <span>Modération : 
                            <strong className={`ml-1 ${
                              offer.moderation_status === "approved" ? "text-emerald-500" : offer.moderation_status === "rejected" ? "text-rose-500" : "text-amber-500"
                            }`}>{offer.moderation_status}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:self-center">
                        <button
                          onClick={() => handleEditOffer(offer)}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold"
                        >
                          Éditer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CANDIDATURES RECEIVED */}
          {activeSubTab === "applications" && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg text-slate-950 dark:text-white">Candidatures reçues pour vos postes</h3>

              {applications.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Aucune candidature reçue pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-slate-400">Candidature pour :</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">{app.job_offer?.titre}</span>
                          </div>

                          <h4 className="font-bold text-slate-900 dark:text-white text-md">
                            Candidat : {app.cv?.visibility === "anonymous" ? "Anonyme" : (app.cv?.data?.nom || "Candidat")}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">Poste visé : {app.cv?.data?.titre || app.cv?.titre_poste || "Tech Expert"}</p>

                          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-xs text-slate-700 dark:text-slate-300">
                            <strong>Message d'accompagnement :</strong>
                            <p className="mt-1 leading-relaxed whitespace-pre-wrap">{app.message || "Aucun message joint."}</p>
                          </div>

                          {/* Joined CV/Bio attachments link */}
                          <div className="mt-4 flex items-center gap-3">
                            {app.cv && (
                              <a
                                href={`https://ebookstore-73b.pages.dev/cv/${app.cv.reference}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200"
                              >
                                <FileText className="h-3.5 w-3.5" /> Consulter le CV complet <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Status update controls */}
                        <div className="flex flex-col items-end gap-2 shrink-0 justify-between self-stretch">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">Statut :</span>
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              app.statut === "acceptee" 
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
                                : app.statut === "refusee"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {app.statut === "envoyee" ? "reçue" : app.statut}
                            </span>
                          </div>

                          {app.statut !== "acceptee" && app.statut !== "refusee" ? (
                            <div className="flex items-center gap-1.5 mt-3">
                              <button
                                disabled={actionLoading === app.id}
                                onClick={() => handleUpdateAppStatus(app.id, "acceptee")}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all"
                              >
                                {actionLoading === app.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Accepter"}
                              </button>
                              <button
                                disabled={actionLoading === app.id}
                                onClick={() => handleUpdateAppStatus(app.id, "refusee")}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-bold transition-all"
                              >
                                Refuser
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Candidature clôturée</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CANDIDATE MATCHING (AI RECOMMENDATIONS) */}
          {activeSubTab === "match" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-950 dark:text-white">Matching intelligent de candidats</h3>
                <span className="text-xs text-slate-400">Recherche automatisée par compétences clés</span>
              </div>

              {matchedCvs.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <Sparkles className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">Aucun candidat ne correspond à vos offres actuellement. Créez des offres actives !</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matchedCvs.map((cv: any) => (
                    <div key={cv.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">{cv.reference}</span>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-2 py-0.5 rounded">
                            {cv.score ? `${Math.round(cv.score)}% Match` : "90% Match"}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-950 dark:text-white text-md">
                          {cv.visibility === "anonymous" ? "Candidat Anonyme" : (cv.data?.nom || "Tech Expert")}
                        </h4>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          {cv.data?.titre || cv.titre_poste || "Développeur"}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-3 line-clamp-3">
                          {cv.summary || "Aucun résumé rédigé."}
                        </p>

                        {/* Competencies */}
                        {(cv.data?.competences || cv.competences) && (
                          <div className="flex flex-wrap gap-1 mt-4">
                            {(cv.data?.competences || cv.competences).slice(0, 5).map((comp: string, i: number) => (
                              <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                                {comp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {cv.lieu || "Dakar, Sénégal"}
                        </span>
                        
                        <a
                          href={`https://ebookstore-73b.pages.dev/cv/${cv.reference}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-bold"
                        >
                          Voir le profil <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
