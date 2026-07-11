import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  User, 
  Shield, 
  MapPin, 
  Search, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  Loader2, 
  Zap, 
  ChevronRight, 
  Building, 
  FileText,
  UserCheck
} from "lucide-react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import AdminPanel from "./components/AdminPanel";
import DashboardView from "./components/DashboardView";
import CVEditorView from "./components/CVEditorView";
import BioEditorView from "./components/BioEditorView";
import CVPublicView from "./components/CVPublicView";
import BioPublicView from "./components/BioPublicView";
import InstallConnectorView from "./components/InstallConnectorView";
import JobsView from "./components/JobsView";
import RecruiterPortal from "./components/RecruiterPortal";
import { CV, Bio, Profile } from "./types";
import { hasSupabaseKeys, supabase, API_BASE_URL } from "./supabaseClient";

export default function App() {
  // Navigation & Views
  const [currentView, setView] = useState<string>("home"); // home, jobs, dashboard, cv-editor, bio-editor, recruiter-portal, admin, install-connector
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Selected CV / Bio edit session state
  const [activeCV, setActiveCV] = useState<CV | null>(null);
  const [activeBio, setActiveBio] = useState<Bio | null>(null);

  // Deep Link States (for CV reference or Bio slug rendering)
  const [deepLinkCvRef, setDeepLinkCvRef] = useState<string | null>(null);
  const [deepLinkBioSlug, setDeepLinkBioSlug] = useState<string | null>(null);

  // User Session States
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<string>("user"); // user | recruiter | moderator | admin

  // Search & Filters for Public Candidates Directory (Home View)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSecteur, setFilterSecteur] = useState("all");
  const [filterLieu, setFilterLieu] = useState("all");
  const [onlyDisponible, setOnlyDisponible] = useState(false);

  // Candidates Data (fetched on Home View)
  const [publicCvs, setPublicCvs] = useState<CV[]>([]);
  const [publicBios, setPublicBios] = useState<Bio[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Success Notification banner
  const [successNotification, setSuccessNotification] = useState<{ show: boolean; message: string } | null>(null);

  // Auth synchronization with Supabase
  useEffect(() => {
    if (hasSupabaseKeys && supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userEmail = session.user.email || "";
          setUser({ id: session.user.id, email: userEmail });
          // Check role in profiles
          fetchUserProfileRole(session.user.id, userEmail);
          // Save JWT token in localStorage for MCP / standard API auth
          localStorage.setItem("sb-token", session.access_token);
        } else {
          setUser(null);
          setRole("user");
          localStorage.removeItem("sb-token");
        }
      });

      // Listen for changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userEmail = session.user.email || "";
          setUser({ id: session.user.id, email: userEmail });
          fetchUserProfileRole(session.user.id, userEmail);
          localStorage.setItem("sb-token", session.access_token || "");
        } else {
          setUser(null);
          setRole("user");
          localStorage.removeItem("sb-token");
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const fetchUserProfileRole = async (userId: string, email: string) => {
    if (!supabase) return;
    try {
      if (email === "techsen237@gmail.com") {
        setRole("admin");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      
      if (!error && data) {
        setRole(data.role || "user");
      } else {
        setRole("user");
      }
    } catch (e) {
      console.error("Error fetching user profile role:", e);
      setRole("user");
    }
  };

  // Synchronize browser URL bar and capture deep links (e.g. /cv/CV-2026-XYZ, /bio/john-doe, /install-connector, /dashboard)
  useEffect(() => {
    const handlePathAndRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith("/cv/")) {
        const reference = path.substring(4);
        if (reference) {
          setDeepLinkCvRef(reference);
          setDeepLinkBioSlug(null);
          setView(`cv-view:${reference}`);
        }
      } else if (path.startsWith("/bio/")) {
        const slug = path.substring(5);
        if (slug) {
          setDeepLinkBioSlug(slug);
          setDeepLinkCvRef(null);
          setView(`bio-view:${slug}`);
        }
      } else if (path === "/dashboard") {
        setView("dashboard");
      } else if (path === "/install-connector") {
        setView("install-connector");
      } else if (path === "/jobs") {
        setView("jobs");
      } else {
        setView("home");
      }
    };

    handlePathAndRoute();
    window.addEventListener("popstate", handlePathAndRoute);
    return () => window.removeEventListener("popstate", handlePathAndRoute);
  }, []);

  // Update browser URL state based on current view changes
  useEffect(() => {
    const path = window.location.pathname;
    if (currentView === "dashboard" && path !== "/dashboard") {
      window.history.pushState(null, "", "/dashboard");
    } else if (currentView === "install-connector" && path !== "/install-connector") {
      window.history.pushState(null, "", "/install-connector");
    } else if (currentView === "jobs" && path !== "/jobs") {
      window.history.pushState(null, "", "/jobs");
    } else if (currentView === "home" && path !== "/") {
      window.history.pushState(null, "", "/");
    } else if (currentView.startsWith("cv-view:")) {
      const ref = currentView.split(":")[1];
      if (ref && path !== `/cv/${ref}`) {
        window.history.pushState(null, "", `/cv/${ref}`);
      }
    } else if (currentView.startsWith("bio-view:")) {
      const slug = currentView.split(":")[1];
      if (slug && path !== `/bio/${slug}`) {
        window.history.pushState(null, "", `/bio/${slug}`);
      }
    }
  }, [currentView]);

  // Fetch Public Directory candidates (CVs and Bios)
  const fetchCandidates = async () => {
    if (!supabase) return;
    setLoadingCandidates(true);
    try {
      // 1. Fetch public CVs
      const { data: cvs, error: cvErr } = await supabase
        .from("cvs")
        .select("*")
        .in("visibility", ["public", "anonymous"])
        .order("is_public", { ascending: false }); // Boosted or verified first if available

      // 2. Fetch public Bios
      const { data: bios, error: bioErr } = await supabase
        .from("bios")
        .select("*")
        .eq("is_public", true);

      if (!cvErr) setPublicCvs(cvs || []);
      if (!bioErr) setPublicBios(bios || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (currentView === "home") {
      fetchCandidates();
    }
  }, [currentView]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setRole("user");
    localStorage.removeItem("sb-token");
    setView("home");
  };

  const handleLoginSuccess = (userData: { id: string; email: string }, userRole: string) => {
    setUser(userData);
    setRole(userRole);
    setAuthModalOpen(false);
  };

  // Filter public CVs list
  const filteredCvs = publicCvs.filter(cv => {
    const matchesQuery = 
      (cv.data?.nom && cv.data.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cv.data?.titre && cv.data.titre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cv.titre_poste && cv.titre_poste.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cv.data?.competences && cv.data.competences.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesSecteur = filterSecteur === "all" || cv.secteur === filterSecteur;
    const matchesLieu = filterLieu === "all" || cv.lieu === filterLieu;
    const matchesDispo = !onlyDisponible || cv.disponible === true;

    return matchesQuery && matchesSecteur && matchesLieu && matchesDispo;
  });

  // Unique filter variables
  const secteurs = Array.from(new Set(publicCvs.map(cv => cv.secteur).filter(Boolean)));
  const lieux = Array.from(new Set(publicCvs.map(cv => cv.lieu).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top sticky brand header */}
      <Header
        currentView={currentView}
        setView={setView}
        user={user}
        role={role}
        onLogout={handleLogout}
        onOpenAuth={() => setAuthModalOpen(true)}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {/* Main layouts switcher */}
      <main className="flex-grow">
        
        {/* VIEW: HOME / PUBLIC CANDIDATES DIRECTORY */}
        {currentView === "home" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
            
            {/* Hero / Pitch Banner */}
            <div className="p-8 md:p-12 bg-slate-950 text-white rounded-3xl relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 flex items-center justify-center translate-x-12 translate-y-[-12px]">
                <Briefcase className="w-80 h-80" />
              </div>

              <div className="max-w-2xl space-y-4 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 rounded-full border border-amber-500/10">
                  <Sparkles className="h-3.5 w-3.5" /> IA & Recrutement PWA de confiance
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight leading-tight">
                  Connectez-vous aux talents d'Afrique francophone
                </h2>
                <p className="text-slate-300 text-sm md:text-md leading-relaxed">
                  Consultez des centaines de profils d'experts technologiques certifiés, téléchargez leurs CV originaux en PDF, ou publiez vos offres d'emploi pour lancer l'entretien.
                </p>
                
                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setView("jobs")}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer"
                  >
                    Découvrir les offres d'emploi
                  </button>
                  <button
                    onClick={() => {
                      if (!user) setAuthModalOpen(true);
                      else setView("dashboard");
                    }}
                    className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Créer mon profil candidat
                  </button>
                </div>
              </div>
            </div>

            {/* Quick search and advanced filters */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 h-4.5 w-4.5 text-slate-400 top-2.5" />
                  <input
                    type="text"
                    placeholder="Rechercher par compétence, poste ou nom de candidat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <select
                  value={filterSecteur}
                  onChange={(e) => setFilterSecteur(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="all">Tous les secteurs</option>
                  {secteurs.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={filterLieu}
                  onChange={(e) => setFilterLieu(e.target.value)}
                  className="px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                >
                  <option value="all">Tous les pays/villes</option>
                  {lieux.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <label className="flex items-center gap-2 font-bold text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyDisponible}
                    onChange={(e) => setOnlyDisponible(e.target.checked)}
                    className="rounded text-indigo-600 border-slate-300"
                  />
                  Candidats immédiatement disponibles ⚡
                </label>
              </div>
            </div>

            {/* Candidates grid */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display font-black text-lg text-slate-900">Profils de candidats</h3>
                <span className="text-xs text-slate-400 font-bold">{filteredCvs.length} profils trouvés</span>
              </div>

              {loadingCandidates ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                  <p className="text-xs text-slate-400 mt-2">Chargement des profils d'experts...</p>
                </div>
              ) : filteredCvs.length === 0 ? (
                <div className="p-16 text-center border-2 border-dashed border-slate-250 rounded-2xl bg-slate-50">
                  <UserCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-bold">Aucun profil ne correspond à vos critères de recherche.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCvs.map((cv) => {
                    const isAnonymous = cv.visibility === "anonymous";
                    const hasLogo = !isAnonymous && cv.data?.photo;
                    
                    return (
                      <div
                        key={cv.id}
                        onClick={() => setView(`cv-view:${cv.reference}`)}
                        className={`bg-white border ${
                          cv.is_boosted 
                            ? "border-amber-300 shadow-md ring-1 ring-amber-400/10 bg-amber-500/[0.01]" 
                            : "border-slate-200"
                        } hover:border-slate-300 hover:shadow-lg rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between h-full group cursor-pointer`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            {hasLogo ? (
                              <img
                                src={cv.data.photo}
                                alt="Photo candidat"
                                referrerPolicy="no-referrer"
                                className="h-12 w-12 object-cover rounded-xl border border-slate-100"
                              />
                            ) : (
                              <div className="p-3 bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-650 rounded-xl transition-colors">
                                <FileText className="h-6 w-6" />
                              </div>
                            )}

                            {/* Visibility Badge & Boost label */}
                            <div className="flex items-center gap-1">
                              {cv.is_boosted && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] font-bold uppercase rounded">
                                  <Zap className="h-2.5 w-2.5" /> Boosté ⚡
                                </span>
                              )}
                              {isAnonymous ? (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold uppercase rounded border border-amber-100">
                                  Anonyme
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase rounded border border-emerald-100">
                                  Public
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider">
                              REF: {cv.reference}
                            </span>
                            <h3 className="text-md font-bold text-slate-900 mt-1 leading-tight group-hover:text-indigo-650 transition-colors">
                              {isAnonymous ? "Candidat Anonyme" : (cv.data?.nom || "Candidat")}
                            </h3>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              {cv.data?.titre || cv.titre_poste || "Tech Expert"}
                            </p>

                            {cv.summary && (
                              <p className="text-xs text-slate-400 leading-relaxed mt-3 line-clamp-2">
                                {cv.summary}
                              </p>
                            )}

                            {cv.data?.competences && cv.data.competences.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-4">
                                {cv.data.competences.slice(0, 3).map((comp, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-semibold rounded">
                                    {comp}
                                  </span>
                                ))}
                                {cv.data.competences.length > 3 && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-mono rounded">
                                    +{cv.data.competences.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold font-mono">
                            {cv.lieu || "Non localisé"}
                          </span>

                          <span className="text-xs text-indigo-650 font-bold inline-flex items-center gap-0.5">
                            Voir le profil <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: ACTIVE JOBS BOARD */}
        {currentView === "jobs" && (
          <JobsView 
            currentUser={user} 
            onOpenAuth={() => setAuthModalOpen(true)} 
          />
        )}

        {/* VIEW: MY CANDIDATE SPACE / DASHBOARD */}
        {currentView === "dashboard" && user && (
          <DashboardView
            user={user}
            setView={setView}
            onEditCV={(cv) => {
              setActiveCV(cv);
              setView("cv-editor");
            }}
            onEditBio={(bio) => {
              setActiveBio(bio);
              setView("bio-editor");
            }}
          />
        )}

        {/* VIEW: CV EDITOR */}
        {currentView === "cv-editor" && activeCV && (
          <CVEditorView
            cv={activeCV}
            onBack={() => setView("dashboard")}
            onSave={(updatedCV) => {
              setActiveCV(updatedCV);
              setSuccessNotification({
                show: true,
                message: "🎉 Félicitations ! Votre Curriculum Vitae a été enregistré et compilé avec succès."
              });
              setView("dashboard");
            }}
          />
        )}

        {/* VIEW: BIO EDITOR */}
        {currentView === "bio-editor" && activeBio && (
          <BioEditorView
            bio={activeBio}
            onBack={() => setView("dashboard")}
            onSave={(updatedBio) => {
              setActiveBio(updatedBio);
              setSuccessNotification({
                show: true,
                message: "🎉 Votre biographie professionnelle a été mise à jour avec succès."
              });
              setView("dashboard");
            }}
          />
        )}

        {/* DEEP LINK OR PUBLIC VIEW: PUBLIC CV DETAILS */}
        {currentView.startsWith("cv-view:") && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <CVPublicView
              reference={currentView.split(":")[1]}
              onBack={() => setView("home")}
            />
          </div>
        )}

        {/* DEEP LINK OR PUBLIC VIEW: PUBLIC BIO DETAILS */}
        {currentView.startsWith("bio-view:") && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <BioPublicView
              slug={currentView.split(":")[1]}
              onBack={() => setView("home")}
            />
          </div>
        )}

        {/* VIEW: CONNECTOR GUIDE */}
        {currentView === "install-connector" && (
          <InstallConnectorView user={user} onBack={() => setView("dashboard")} />
        )}

        {/* VIEW: RECRUITER PORTAL */}
        {currentView === "recruiter-portal" && user && (
          <RecruiterPortal currentUser={user} />
        )}

        {/* VIEW: ADMIN BACK-OFFICE */}
        {currentView === "admin" && user && (role === "admin" || role === "moderator") && (
          <AdminPanel currentUser={user} userRole={role} />
        )}

      </main>

      {/* Auth Modal Container */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Global Success Banner */}
      {successNotification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-xl max-w-sm border border-slate-800 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-indigo-650 text-white rounded-lg">
              <CheckCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold leading-relaxed">{successNotification.message}</p>
              <button
                onClick={() => setSuccessNotification(null)}
                className="mt-2 text-[10px] font-bold text-slate-400 hover:text-white transition-colors"
              >
                Ignorer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
