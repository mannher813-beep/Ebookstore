import React from "react";
import { 
  Briefcase, 
  User, 
  Shield, 
  LogOut, 
  Search, 
  Building, 
  Coins, 
  Menu, 
  X, 
  FileText, 
  Users,
  Award,
  Bell
} from "lucide-react";

interface HeaderProps {
  currentView: string;
  setView: (view: string) => void;
  user: any;
  role: string;
  onLogout: () => void;
  onOpenAuth: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export default function Header({
  currentView,
  setView,
  user,
  role,
  onLogout,
  onOpenAuth,
  searchTerm,
  setSearchTerm,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSetView = (view: string) => {
    setView(view);
    setMobileMenuOpen(false);
  };

  const getRoleBadgeLabel = (r: string) => {
    switch (r) {
      case "admin": return "Super-Admin";
      case "moderator": return "Modérateur";
      case "recruiter": return "Recruteur";
      default: return "Candidat";
    }
  };

  const getRoleBadgeClass = (r: string) => {
    switch (r) {
      case "admin": return "bg-red-50 text-red-700 border-red-500/20";
      case "moderator": return "bg-amber-50 text-amber-700 border-amber-500/20";
      case "recruiter": return "bg-indigo-50 text-indigo-700 border-indigo-500/20";
      default: return "bg-slate-50 text-slate-700 border-slate-500/20";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Logo and Brand */}
        <div
          onClick={() => handleSetView("home")}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
          id="nav-logo"
        >
          <div className="p-2 bg-slate-950 text-white rounded-xl group-hover:bg-indigo-600 transition-colors duration-300">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display font-black text-[17px] tracking-tight text-slate-900 leading-none">
              Recrutement<span className="text-indigo-650">Afrique</span>
            </h1>
            <p className="text-[9px] text-slate-400 mt-1 font-mono tracking-widest uppercase">
              RESEAU EMPLOI TECH
            </p>
          </div>
        </div>

        {/* Global search - only on search views */}
        {(currentView === "home" || currentView === "jobs") && (
          <div className="hidden md:flex items-center flex-1 max-w-sm relative">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Poste, compétence, ville ou secteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
              id="search-input"
            />
          </div>
        )}

        {/* Navigation Links for Desktop */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <button
            onClick={() => handleSetView("home")}
            className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer ${
              currentView === "home"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            id="nav-home"
          >
            Candidats
          </button>

          <button
            onClick={() => handleSetView("jobs")}
            className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all cursor-pointer ${
              currentView === "jobs"
                ? "bg-slate-950 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
            id="nav-jobs"
          >
            Offres d'emploi
          </button>

          {user && (
            <>
              <button
                onClick={() => handleSetView("dashboard")}
                className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === "dashboard" || currentView === "cv-editor" || currentView === "bio-editor"
                    ? "bg-indigo-650 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                id="nav-dashboard"
              >
                <User className="h-3.5 w-3.5" />
                <span>Mon Espace CV</span>
              </button>

              {(role === "recruiter" || role === "admin" || role === "moderator") && (
                <button
                  onClick={() => handleSetView("recruiter-portal")}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === "recruiter-portal"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  id="nav-recruiter"
                >
                  <Building className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Portail Recruteur</span>
                </button>
              )}

              {(role === "moderator" || role === "admin") && (
                <button
                  onClick={() => handleSetView("admin")}
                  className={`px-3 py-1.5 rounded-lg text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentView === "admin"
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  id="nav-admin"
                >
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span>Modération</span>
                </button>
              )}
            </>
          )}

          {/* Session controls */}
          {user ? (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[120px]">{user.email}</span>
                <span className={`px-1.5 py-0.5 text-[8px] font-bold font-mono tracking-wider uppercase rounded-sm border ${getRoleBadgeClass(role)}`}>
                  {getRoleBadgeLabel(role)}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Se déconnecter"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                id="btn-logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs lg:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              id="btn-login-open"
            >
              <User className="h-3.5 w-3.5" />
              <span>Connexion</span>
            </button>
          )}
        </nav>

        {/* Mobile Navigation controls */}
        <div className="flex items-center md:hidden gap-1">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-16 z-30 bg-slate-900/15 backdrop-blur-xs transition-opacity md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="absolute top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-xl p-5 space-y-3 md:hidden animate-in fade-in slide-in-from-top-4 duration-200"
            id="mobile-drawer"
          >
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => handleSetView("home")}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                  currentView === "home" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Candidats
              </button>

              <button
                onClick={() => handleSetView("jobs")}
                className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all ${
                  currentView === "jobs" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Offres d'emploi
              </button>

              {user ? (
                <>
                  <button
                    onClick={() => handleSetView("dashboard")}
                    className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2 ${
                      currentView === "dashboard" || currentView === "cv-editor" || currentView === "bio-editor" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <User className="h-4 w-4 text-indigo-500" />
                    <span>Mon Espace CV</span>
                  </button>

                  {(role === "recruiter" || role === "admin" || role === "moderator") && (
                    <button
                      onClick={() => handleSetView("recruiter-portal")}
                      className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2 ${
                        currentView === "recruiter-portal" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Building className="h-4 w-4 text-indigo-500" />
                      <span>Portail Recruteur</span>
                    </button>
                  )}

                  {(role === "moderator" || role === "admin") && (
                    <button
                      onClick={() => handleSetView("admin")}
                      className={`w-full px-4 py-2.5 rounded-xl text-left text-sm font-semibold transition-all flex items-center gap-2 ${
                        currentView === "admin" ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Shield className="h-4 w-4 text-amber-500" />
                      <span>Modération</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-slate-100 my-2"></div>

                  <div className="px-4 py-3 bg-slate-50 rounded-xl flex items-center justify-between gap-3 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-850 truncate max-w-[180px]">{user.email}</span>
                      <span className="text-[9px] text-indigo-650 uppercase font-bold font-mono tracking-wider">{getRoleBadgeLabel(role)}</span>
                    </div>
                    <button
                      onClick={() => {
                        onLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs"
                >
                  <User className="h-4 w-4" />
                  <span>Connexion / Inscription</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
